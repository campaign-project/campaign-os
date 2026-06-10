/**
 * Yield model — the Moat-B flywheel (RFC-001 §7.4).
 *
 * The optimizer routes volunteer/paid hours to maximize VALID signatures. Validity is
 * unknown at cold start, so it begins with priors; but every batch the validation
 * engine processes yields observed validity by gatherer / location / capture format.
 * This model folds those observations back in so routing gets smarter per signature —
 * the compounding advantage nobody else has.
 *
 * Method: Beta-Binomial conjugate. The prior is pseudo-counts Beta(α₀,β₀) with mean =
 * prior-rate and α₀+β₀ = prior "strength". After observing v valid of n, the posterior
 * mean is (α₀+v)/(strength+n) — it sits at the prior when n=0 and converges to v/n as n
 * grows. A weak prior (small strength) is learned fast (per-gatherer); a stronger prior
 * holds where we already know the answer (digital-with-verification ≈ perfect).
 *
 * Consumes the validation engine's BatchReport slices directly. No network, no LLM.
 */

import type { BatchReport } from "../validation-engine/validate.ts";

export type Dimension = "capture" | "gatherer" | "location";

export interface YieldEstimate {
  dim: Dimension;
  key: string;
  rate: number; // posterior-mean validity in [0,1]
  n: number; // observed signatures behind this estimate
  strength: number; // prior pseudo-count
  source: "prior" | "blended" | "observed";
}

// Cold-start priors (RFC-001 §7.4 / Ballotpedia ~80% avg validity).
const PRIORS: Record<Dimension, (key: string) => { rate: number; strength: number }> = {
  // digital with real-time voter-file verify ≈ mechanical → high & fairly confident;
  // wet/paper centers near the ~0.80 population average but varies → lighter.
  capture: (k) => (k === "digital" ? { rate: 0.97, strength: 30 } : { rate: 0.75, strength: 25 }),
  // No per-person / per-place prior exists → start at the global average, but WEAK so a
  // gatherer's or location's own track record takes over quickly. This is what compounds.
  gatherer: () => ({ rate: 0.8, strength: 8 }),
  location: () => ({ rate: 0.8, strength: 8 }),
};

export class YieldModel {
  private obs = new Map<string, { valid: number; total: number }>();
  private id(d: Dimension, key: string) { return `${d}:${key}`; }

  /** Ingest one observed slice. */
  observe(dim: Dimension, key: string, valid: number, total: number): void {
    const e = this.obs.get(this.id(dim, key)) ?? { valid: 0, total: 0 };
    e.valid += valid;
    e.total += total;
    this.obs.set(this.id(dim, key), e);
  }

  /** Ingest a whole validation-engine report (all three dimensions at once). */
  observeReport(r: BatchReport): void {
    for (const s of r.byCapture) this.observe("capture", s.key, s.valid, s.total);
    for (const s of r.byGatherer) this.observe("gatherer", s.key, s.valid, s.total);
    for (const s of r.byLocation) this.observe("location", s.key, s.valid, s.total);
  }

  priorRate(dim: Dimension, key: string): number { return PRIORS[dim](key).rate; }

  /** Posterior validity estimate for a slice (prior when unseen → observed at scale). */
  estimate(dim: Dimension, key: string): YieldEstimate {
    const p = PRIORS[dim](key);
    const a0 = p.rate * p.strength;
    const e = this.obs.get(this.id(dim, key)) ?? { valid: 0, total: 0 };
    const rate = (a0 + e.valid) / (p.strength + e.total);
    const source = e.total === 0 ? "prior" : e.total < 2 * p.strength ? "blended" : "observed";
    return { dim, key, rate, n: e.total, strength: p.strength, source };
  }

  // ── persistence primitives (pure — no I/O; yieldstore.ts owns the disk) ──

  /** Plain-object copy of the accumulated counts, keyed "dim:key". */
  snapshot(): Record<string, { valid: number; total: number }> {
    return Object.fromEntries([...this.obs].map(([k, v]) => [k, { valid: v.valid, total: v.total }]));
  }

  /** ADD a snapshot's counts into this model — additive, so warming from a store then
   *  observing a new drive and re-snapshotting accumulates across drives (the compounding). */
  merge(snap: Record<string, { valid: number; total: number }>): void {
    for (const [k, v] of Object.entries(snap || {})) {
      const e = this.obs.get(k) ?? { valid: 0, total: 0 };
      e.valid += v.valid || 0;
      e.total += v.total || 0;
      this.obs.set(k, e);
    }
  }
}
