/**
 * Record-linkage matcher — does a petition signer correspond to a row in the
 * registered-voter file?
 *
 * Two-stage, the standard scalable design:
 *   1. BLOCKING — index voters by a cheap key (zip5 + last-name prefix) so a signer
 *      is only ever scored against the handful of plausible voters, not all ~N
 *      million. Without this, validating a statewide petition is O(signers × voters).
 *   2. SCORING — for each candidate in the block, a weighted similarity over name
 *      (Jaro-Winkler, nickname-aware) + address (house-number exact match dominates,
 *      then street name + ZIP). Best candidate's score decides the band.
 *
 * Output is a banded verdict (MATCH / REVIEW / NO_MATCH), never a naked boolean —
 * the gray band is what lets the validity layer (rules.ts) refuse to auto-count an
 * uncertain signature, which is the legal bright line.
 *
 * NO network, NO LLM — deterministic, auditable.
 */

import { normName, normAddress, basic, type NormName, type NormAddress } from "./normalize.ts";

export interface VoterRecord {
  id: string;
  name: string;
  address: string;
  status: "active" | "inactive" | "cancelled";
  registeredOn?: string; // ISO date; used for "registered at time of signing"
  county?: string;
  district?: string; // e.g. congressional/legislative district, for distribution checks
}

export interface SignerInput {
  id: string;
  name: string;
  address: string;
  signedOn?: string; // ISO date
  county?: string;
  gatherer?: string; // who collected it — for yield intelligence (Moat B)
  capture?: "wet" | "digital"; // capture format — for yield intelligence
  attestedResident?: boolean; // signer swore residency (matters in no-registration states)
}

export type MatchBand = "MATCH" | "REVIEW" | "NO_MATCH";

export interface MatchResult {
  band: MatchBand;
  score: number; // 0..1 best candidate score
  voter?: VoterRecord; // best candidate (present for MATCH/REVIEW)
  nameScore: number;
  addrScore: number;
  candidatesConsidered: number;
  detail: string;
}

// Tunables. Solid identity => MATCH; plausible-but-uncertain => REVIEW (human/extra
// data needed); clearly different or absent => NO_MATCH.
export const MATCH_AT = 0.88;
export const REVIEW_AT = 0.7;

// ----------------------------------------------------------------------------
// Jaro-Winkler — strong on short strings with transpositions/typos (names).
// ----------------------------------------------------------------------------

function jaro(a: string, b: string): number {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;
  const md = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aMatch = new Array(a.length).fill(false);
  const bMatch = new Array(b.length).fill(false);
  let matches = 0;
  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - md);
    const hi = Math.min(i + md + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bMatch[j] || a[i] !== b[j]) continue;
      aMatch[i] = bMatch[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  // count transpositions
  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aMatch[i]) continue;
    while (!bMatch[k]) k++;
    if (a[i] !== b[k]) t++;
    k++;
  }
  t /= 2;
  return (matches / a.length + matches / b.length + (matches - t) / matches) / 3;
}

export function jaroWinkler(a: string, b: string): number {
  const j = jaro(a, b);
  if (j < 0.7) return j; // only boost already-similar strings
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * 0.1 * (1 - j);
}

// ----------------------------------------------------------------------------
// Component scorers
// ----------------------------------------------------------------------------

function scoreName(a: NormName, b: NormName): number {
  if (!a.last || !b.last) return 0;
  const last = jaroWinkler(a.last, b.last);
  // First-name: exact after nickname-fold is full credit; else JW; a shared
  // initial (one side abbreviated, "a" vs "andrew") gets partial credit.
  let first: number;
  if (a.first && b.first && a.first === b.first) first = 1;
  else if (a.first && b.first && (a.first[0] === b.first[0]) && (a.first.length === 1 || b.first.length === 1)) first = 0.85;
  else first = jaroWinkler(a.first, b.first);
  // Last name is the stronger identity signal; weight it 60/40.
  return 0.6 * last + 0.4 * first;
}

function scoreAddr(a: NormAddress, b: NormAddress): number {
  // House number is the sharpest discriminator: a different number is almost
  // always a different household. Treat a number mismatch as a hard penalty.
  let numScore: number;
  if (a.number && b.number) numScore = a.number === b.number ? 1 : 0;
  else numScore = 0.5; // one side missing a number → neutral-ish, lean on street/zip
  const streetScore = a.street && b.street ? jaroWinkler(a.street, b.street) : 0.5;
  const zipScore = a.zip5 && b.zip5 ? (a.zip5 === b.zip5 ? 1 : 0) : 0.5;
  // number 0.5, street 0.35, zip 0.15
  return 0.5 * numScore + 0.35 * streetScore + 0.15 * zipScore;
}

// ----------------------------------------------------------------------------
// Index (blocking)
// ----------------------------------------------------------------------------

export interface VoterIndex {
  size: number;
  byBlock: Map<string, Array<{ rec: VoterRecord; n: NormName; a: NormAddress }>>;
  blockKey: (n: NormName, a: NormAddress) => string[];
}

/** Block on zip5 + first-3 of last name. A signer is compared only to voters who
 *  share a block. We also fall back to a last-name-only block so a wrong/missing
 *  ZIP doesn't cause a false NO_MATCH. */
function blockKeysFor(n: NormName, a: NormAddress): string[] {
  const lastPfx = n.last.slice(0, 3);
  const keys = [`L:${lastPfx}`];
  if (a.zip5) keys.push(`Z:${a.zip5}|L:${lastPfx}`);
  return keys;
}

export function buildIndex(voters: VoterRecord[]): VoterIndex {
  const byBlock = new Map<string, Array<{ rec: VoterRecord; n: NormName; a: NormAddress }>>();
  for (const rec of voters) {
    const n = normName(rec.name);
    const a = normAddress(rec.address);
    const entry = { rec, n, a };
    for (const k of blockKeysFor(n, a)) {
      const arr = byBlock.get(k);
      if (arr) arr.push(entry);
      else byBlock.set(k, [entry]);
    }
  }
  return { size: voters.length, byBlock, blockKey: blockKeysFor };
}

// ----------------------------------------------------------------------------
// Match
// ----------------------------------------------------------------------------

export function matchSigner(signer: SignerInput, index: VoterIndex): MatchResult {
  const sn = normName(signer.name);
  const sa = normAddress(signer.address);

  // Gather unique candidates across this signer's block keys.
  const seen = new Set<string>();
  const candidates: Array<{ rec: VoterRecord; n: NormName; a: NormAddress }> = [];
  for (const k of index.blockKey(sn, sa)) {
    for (const e of index.byBlock.get(k) ?? []) {
      if (seen.has(e.rec.id)) continue;
      seen.add(e.rec.id);
      candidates.push(e);
    }
  }

  let best: { rec: VoterRecord; nameScore: number; addrScore: number; score: number } | null = null;
  for (const c of candidates) {
    const nameScore = scoreName(sn, c.n);
    const addrScore = scoreAddr(sa, c.a);
    // Name carries identity; address confirms it. 0.65 / 0.35.
    const score = 0.65 * nameScore + 0.35 * addrScore;
    if (!best || score > best.score) best = { rec: c.rec, nameScore, addrScore, score };
  }

  if (!best) {
    return { band: "NO_MATCH", score: 0, nameScore: 0, addrScore: 0, candidatesConsidered: 0, detail: "no candidate in any block (not in voter file)" };
  }

  const band: MatchBand = best.score >= MATCH_AT ? "MATCH" : best.score >= REVIEW_AT ? "REVIEW" : "NO_MATCH";
  const detail =
    band === "MATCH" ? `confident match to ${best.rec.id} (${best.rec.name})`
    : band === "REVIEW" ? `probable match to ${best.rec.id} below auto-accept threshold`
    : `best candidate ${best.rec.id} too weak (${best.score.toFixed(2)})`;

  return {
    band,
    score: best.score,
    voter: band === "NO_MATCH" ? undefined : best.rec,
    nameScore: best.nameScore,
    addrScore: best.addrScore,
    candidatesConsidered: candidates.length,
    detail,
  };
}
