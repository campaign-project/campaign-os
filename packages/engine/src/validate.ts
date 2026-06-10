/**
 * @campaign-os/engine — orchestration.
 *
 * `validateSigner` — the field app's per-capture call: match one signer → verdict + reasons.
 * `validateBatch` — the server's bulk path: match all, dedup across the batch, aggregate, and
 * emit yield-intelligence slices (validity by gatherer / location / capture) + a "gather N more"
 * projection. NEEDS_REVIEW is never counted as safe-to-submit (the bright line).
 *
 * Pure: no platform deps.
 */

import { buildIndex, matchSigner, type VoterIndex, type VoterRecord, type SignerInput, type MatchBand } from "./match";
import { evaluate, type StateContext, type Verdict } from "./rules";

export interface SignerVerdict {
  verdict: Verdict;
  band: MatchBand;
  score: number;
  voter?: VoterRecord;
  matchedVoterId?: string;
  reasons: string[];
}

/** Single-signer validation — what the app runs at the moment of capture. */
export function validateSigner(signer: SignerInput, index: VoterIndex, ctx: StateContext): SignerVerdict {
  const m = matchSigner(signer, index);
  const res = evaluate(signer, m, ctx);
  return { verdict: res.verdict, band: m.band, score: m.score, voter: m.voter, matchedVoterId: res.matchedVoterId, reasons: res.reasons };
}

export interface SignerLedgerRow {
  signer: SignerInput;
  verdict: Verdict;
  score: number;
  matchedVoterId?: string;
  reasons: string[];
}

export interface SliceStat { key: string; total: number; valid: number; rate: number; }

export interface BatchReport {
  jurisdiction: string;
  mode: string;
  total: number;
  valid: number;
  invalid: number;
  review: number;
  duplicates: number;
  validityRate: number;
  ledger: SignerLedgerRow[];
  byGatherer: SliceStat[];
  byLocation: SliceStat[];
  byCapture: SliceStat[];
  projection?: {
    requiredValid: number;
    buffer: number;
    targetRaw: number;
    safeToSubmit: number;
    moreRawNeeded: number;
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
  requiredValid?: number;
  buffer?: number;
}

export function validateBatch(signers: SignerInput[], voters: VoterRecord[], opts: ValidateOpts): BatchReport {
  const index = buildIndex(voters);
  const ledger: SignerLedgerRow[] = [];
  const firstSeenByVoter = new Map<string, number>();
  for (const signer of signers) {
    const m = matchSigner(signer, index);
    const res = evaluate(signer, m, opts.ctx);
    ledger.push({ signer, verdict: res.verdict, score: m.score, matchedVoterId: res.matchedVoterId, reasons: res.reasons });
  }

  let duplicates = 0;
  ledger.forEach((row, i) => {
    const vid = row.matchedVoterId;
    if (!vid || row.verdict === "INVALID") return;
    const firstIdx = firstSeenByVoter.get(vid);
    if (firstIdx === undefined) {
      firstSeenByVoter.set(vid, i);
    } else {
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
    total, valid, invalid, review, duplicates, validityRate, ledger,
    byGatherer: slice(ledger, (r) => r.signer.gatherer),
    byLocation: slice(ledger, (r) => r.signer.address.match(/\b(\d{5})\b/)?.[1]),
    byCapture: slice(ledger, (r) => r.signer.capture),
  };

  if (opts.requiredValid) {
    const buffer = opts.buffer ?? 1.25;
    const targetRaw = Math.ceil(opts.requiredValid * buffer);
    const rate = validityRate > 0 ? validityRate : 0.8;
    const remainingValidNeeded = Math.max(0, opts.requiredValid - valid);
    report.projection = {
      requiredValid: opts.requiredValid,
      buffer,
      targetRaw,
      safeToSubmit: valid,
      moreRawNeeded: Math.ceil(remainingValidNeeded / rate),
      onTrack: valid >= opts.requiredValid,
    };
  }
  return report;
}
