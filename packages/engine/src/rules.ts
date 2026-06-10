/**
 * @campaign-os/engine — validity rules.
 *
 * Turn a match result + state law into a signature verdict. A match is necessary but not
 * sufficient: the voter must be ACTIVE, registered before signing, in the correct jurisdiction,
 * and not a duplicate. Dispatches on a per-state `verificationMode`:
 *   • voter-file-match — match signer → statewide file (normal case)
 *   • county-fan-out   — no single statewide file (NJ/HI/AR/MA/IN); if the county isn't loaded → REVIEW
 *   • residency-only   — North Dakota has no voter registration; rests on filing-officer residency → REVIEW
 *
 * THE BRIGHT LINE: never mark VALID when uncertain. Gray band + non-standard modes → NEEDS_REVIEW,
 * excluded from the safe-to-submit count. A false VALID risks the ballot line; a false REVIEW only
 * costs a second look.
 *
 * PURE: no platform deps. The caller supplies the state context (from BallotAccessDB data the app
 * has already synced) — the engine never reads the filesystem.
 */

import type { MatchResult, SignerInput } from "./match";

export type VerificationMode = "voter-file-match" | "county-fan-out" | "residency-only";
export type Verdict = "VALID" | "INVALID" | "NEEDS_REVIEW";

export interface ValidityResult {
  verdict: Verdict;
  reasons: string[];
  matchedVoterId?: string;
}

// States with no single statewide file — assembled county-by-county.
const COUNTY_FAN_OUT = new Set(["New Jersey", "Hawaii", "Arkansas", "Massachusetts", "Indiana"]);
// The one state with no voter registration at all.
const NO_REGISTRATION = new Set(["North Dakota"]);

export function verificationMode(jurisdiction: string): VerificationMode {
  if (NO_REGISTRATION.has(jurisdiction)) return "residency-only";
  if (COUNTY_FAN_OUT.has(jurisdiction)) return "county-fan-out";
  return "voter-file-match";
}

export interface StateContext {
  jurisdiction: string;
  mode: VerificationMode;
  voterFileTier?: string;
  requiredJurisdiction?: string;
  loadedCounties?: Set<string>;
}

/** Build a context purely from caller-supplied data (mode defaults from the jurisdiction). */
export function makeContext(jurisdiction: string, opts: Partial<StateContext> = {}): StateContext {
  return {
    jurisdiction,
    mode: opts.mode ?? verificationMode(jurisdiction),
    voterFileTier: opts.voterFileTier,
    requiredJurisdiction: opts.requiredJurisdiction,
    loadedCounties: opts.loadedCounties,
  };
}

/** Evaluate one signer's validity given its match result and the state context. Cross-batch
 *  duplicate detection is the caller's job (it needs the whole batch); this judges one signer. */
export function evaluate(signer: SignerInput, m: MatchResult, ctx: StateContext): ValidityResult {
  const reasons: string[] = [];

  if (ctx.mode === "residency-only") {
    if (signer.attestedResident) {
      reasons.push("no voter-registration file in this state; signer attested residency — filing officer must confirm");
      return { verdict: "NEEDS_REVIEW", reasons };
    }
    reasons.push("no voter-registration file in this state and no residency attestation captured");
    return { verdict: "NEEDS_REVIEW", reasons };
  }

  if (ctx.mode === "county-fan-out") {
    const county = signer.county;
    if (!county || !ctx.loadedCounties || !ctx.loadedCounties.has(county)) {
      reasons.push(`county file not loaded (${county ?? "unknown county"}); cannot verify against an assembled-by-county state`);
      return { verdict: "NEEDS_REVIEW", reasons };
    }
  }

  if (m.band === "NO_MATCH") {
    reasons.push("not found in voter file — signer is not a registered voter (or wrong name/address)");
    return { verdict: "INVALID", reasons };
  }
  if (m.band === "REVIEW") {
    reasons.push(`probable match (${m.score.toFixed(2)}) below auto-accept threshold — needs a second look or more identifying data`);
    return { verdict: "NEEDS_REVIEW", reasons, matchedVoterId: m.voter?.id };
  }

  const v = m.voter!;
  if (v.status !== "active") {
    reasons.push(`matched voter ${v.id} is ${v.status}, not an active/eligible elector`);
    return { verdict: "INVALID", reasons, matchedVoterId: v.id };
  }
  if (signer.signedOn && v.registeredOn && v.registeredOn > signer.signedOn) {
    reasons.push(`voter registered ${v.registeredOn}, after the signing date ${signer.signedOn} — not registered at time of signing`);
    return { verdict: "INVALID", reasons, matchedVoterId: v.id };
  }
  if (ctx.requiredJurisdiction && v.district && v.district !== ctx.requiredJurisdiction) {
    reasons.push(`registered in ${v.district}, not the required ${ctx.requiredJurisdiction} — counts toward wrong distribution bucket`);
    return { verdict: "NEEDS_REVIEW", reasons, matchedVoterId: v.id };
  }
  reasons.push(`confident match to active voter ${v.id}; conditions satisfied`);
  return { verdict: "VALID", reasons, matchedVoterId: v.id };
}
