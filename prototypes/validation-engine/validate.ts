/**
 * Batch validation orchestrator.
 *
 * Wires the layers: match each signer → apply state validity rules → detect
 * duplicates across the batch → aggregate. Two outputs that matter to the business:
 *
 *   1. The "safe to submit" count — VALID signatures only. NEEDS_REVIEW is NEVER
 *      counted here (the bright line). This is what underbids petition firms: you
 *      submit a clean petition and gather far fewer raw sigs to hit the threshold.
 *
 *   2. Yield intelligence (Moat B) — validity rate sliced by gatherer, location,
 *      and capture format. Nobody else has this; it compounds per signature and
 *      feeds the optimizer's per-gatherer / per-location priors (RFC-001 §7.4).
 *
 * Plus a projection: at the observed validity rate, how many MORE raw signatures
 * are needed to clear `required × buffer` — i.e. "keep going" or "stop."
 */

import { buildIndex, matchSigner, type VoterRecord, type SignerInput } from "./match.ts";
import { evaluate, type StateContext, type Verdict } from "./rules.ts";

export interface SignerLedgerRow {
  signer: SignerInput;
  verdict: Verdict;
  score: number;
  matchedVoterId?: string;
  reasons: string[];
}

export interface SliceStat {
  key: string;
  total: number;
  valid: number;
  rate: number;
}

export interface BatchReport {
  jurisdiction: string;
  mode: string;
  total: number;
  valid: number;
  invalid: number;
  review: number;
  duplicates: number;
  validityRate: number; // valid / total
  ledger: SignerLedgerRow[];
  byGatherer: SliceStat[];
  byLocation: SliceStat[]; // by ZIP
  byCapture: SliceStat[];
  projection?: {
    requiredValid: number;
    buffer: number;
    targetRaw: number; // required × buffer
    safeToSubmit: number; // current VALID
    moreRawNeeded: number; // at observed rate, raw still to gather
    onTrack: boolean;
  };
}

function slice(rows: SignerLedgerRow[], keyOf: (r: SignerLedgerRow) => string | undefined): SliceStat[] {
  const m = new Map<string, { total: number; valid: number }>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    const e = m.get(k) ?? { total: 0, valid: 0 };
    e.total++;
    if (r.verdict === "VALID") e.valid++;
    m.set(k, e);
  }
  return [...m.entries()]
    .map(([key, e]) => ({ key, total: e.total, valid: e.valid, rate: e.valid / e.total }))
    .sort((a, b) => b.total - a.total);
}

export interface ValidateOpts {
  ctx: StateContext;
  requiredValid?: number; // for the projection
  buffer?: number; // raw-to-valid safety multiplier (default 1.25 ≈ 80% validity prior)
}

export function validateBatch(signers: SignerInput[], voters: VoterRecord[], opts: ValidateOpts): BatchReport {
  const index = buildIndex(voters);
  const ledger: SignerLedgerRow[] = [];

  // First pass: match + evaluate each signer independently.
  const firstSeenByVoter = new Map<string, number>(); // voterId -> ledger row index of first signature
  for (const signer of signers) {
    const m = matchSigner(signer, index);
    const res = evaluate(signer, m, opts.ctx);
    ledger.push({ signer, verdict: res.verdict, score: m.score, matchedVoterId: res.matchedVoterId, reasons: res.reasons });
  }

  // Second pass: duplicate detection. If two signatures resolve to the SAME voter,
  // the first stands and the rest are INVALID-duplicate (a real petition-rejection
  // cause). Only meaningful for rows that matched a voter.
  let duplicates = 0;
  ledger.forEach((row, i) => {
    const vid = row.matchedVoterId;
    if (!vid || row.verdict === "INVALID") return;
    const firstIdx = firstSeenByVoter.get(vid);
    if (firstIdx === undefined) {
      firstSeenByVoter.set(vid, i);
    } else {
      // keep the earlier one; mark this one a duplicate
      row.verdict = "INVALID";
      row.reasons = [`duplicate — voter ${vid} already signed (row ${firstIdx + 1}); only the first signature counts`, ...row.reasons];
      duplicates++;
    }
  });

  const valid = ledger.filter((r) => r.verdict === "VALID").length;
  const invalid = ledger.filter((r) => r.verdict === "INVALID").length;
  const review = ledger.filter((r) => r.verdict === "NEEDS_REVIEW").length;
  const total = ledger.length;
  const validityRate = total ? valid / total : 0;

  const report: BatchReport = {
    jurisdiction: opts.ctx.jurisdiction,
    mode: opts.ctx.mode,
    total,
    valid,
    invalid,
    review,
    duplicates,
    validityRate,
    ledger,
    byGatherer: slice(ledger, (r) => r.signer.gatherer),
    byLocation: slice(ledger, (r) => r.signer.address.match(/\b(\d{5})\b/)?.[1]),
    byCapture: slice(ledger, (r) => r.signer.capture),
  };

  if (opts.requiredValid) {
    const buffer = opts.buffer ?? 1.25;
    const targetRaw = Math.ceil(opts.requiredValid * buffer);
    // At the observed validity rate, raw needed to reach requiredValid net of what we have.
    const rate = validityRate > 0 ? validityRate : 0.8; // fall back to the 80% prior if no data yet
    const remainingValidNeeded = Math.max(0, opts.requiredValid - valid);
    const moreRawNeeded = Math.ceil(remainingValidNeeded / rate);
    report.projection = {
      requiredValid: opts.requiredValid,
      buffer,
      targetRaw,
      safeToSubmit: valid,
      moreRawNeeded,
      onTrack: valid >= opts.requiredValid,
    };
  }

  return report;
}
