/**
 * Validity rules — turn a match result + state law into a signature verdict.
 *
 * A match (signer ↔ voter) is necessary but NOT sufficient for a VALID signature.
 * State law adds conditions: the voter must be ACTIVE/eligible, registered before
 * they signed, in the correct jurisdiction (distribution requirements), and not a
 * duplicate. This layer encodes those checks and — critically — dispatches on a
 * per-state `verificationMode`, because not every state is "match against the file":
 *
 *   • voter-file-match  — the normal case: match signer → statewide voter file.
 *   • county-fan-out    — NO single statewide file (NJ, HI, AR, MA, IN); the file
 *                          must be assembled per county. If the signer's county
 *                          file isn't loaded we cannot match → REVIEW, not INVALID.
 *   • residency-only    — North Dakota has NO voter registration at all. There is
 *                          no file to match against; validity rests on the filing
 *                          officer confirming resident-elector status. Software can
 *                          only surface the residency attestation → REVIEW.
 *
 * THE BRIGHT LINE (RFC-001): never mark a signature VALID when uncertain. The gray
 * band and the non-standard modes all resolve to NEEDS_REVIEW — they are excluded
 * from the "safe to submit" count. A false VALID risks the ballot line; a false
 * NEEDS_REVIEW only costs a second look. We err to the cheap mistake.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { MatchResult, SignerInput } from "./match.ts";

export type VerificationMode = "voter-file-match" | "county-fan-out" | "residency-only";

export type Verdict = "VALID" | "INVALID" | "NEEDS_REVIEW";

export interface ValidityResult {
  verdict: Verdict;
  reasons: string[];
  matchedVoterId?: string;
}

// States with no single statewide file — the file is assembled county-by-county
// (mapped in VOTER_FILE_ACQUISITION.md). MO is decentralized too but the SoS sells
// statewide, so it stays voter-file-match.
const COUNTY_FAN_OUT = new Set(["New Jersey", "Hawaii", "Arkansas", "Massachusetts", "Indiana"]);
// The one state with no voter registration whatsoever.
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
  requiredJurisdiction?: string; // if set, signer must be registered in this district (distribution)
  loadedCounties?: Set<string>; // for county-fan-out: which county files we hold
}

/** Pull the live state record from the verified master so the engine is data-driven
 *  (voter-file tier, jurisdiction name) rather than hardcoded. Returns {} if absent. */
export function loadStateRecord(jurisdiction: string): Record<string, any> {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const master = JSON.parse(readFileSync(join(here, "../../ballot-access-data/verified-rules.master.json"), "utf8"));
    return master.find((r: any) => r.jurisdiction === jurisdiction) ?? {};
  } catch {
    return {};
  }
}

export function makeContext(jurisdiction: string, opts: Partial<StateContext> = {}): StateContext {
  const rec = loadStateRecord(jurisdiction);
  return {
    jurisdiction,
    mode: verificationMode(jurisdiction),
    voterFileTier: rec?.voterFile?.tier,
    requiredJurisdiction: opts.requiredJurisdiction,
    loadedCounties: opts.loadedCounties,
    ...opts,
  };
}

/** Evaluate one signer's validity given its match result and the state context.
 *  Duplicate detection is handled by the caller (validate.ts) since it needs the
 *  whole batch; here we judge a single signer in isolation. */
export function evaluate(signer: SignerInput, m: MatchResult, ctx: StateContext): ValidityResult {
  const reasons: string[] = [];

  // --- residency-only (North Dakota): no file exists to match against. ---
  if (ctx.mode === "residency-only") {
    if (signer.attestedResident) {
      reasons.push("no voter-registration file in this state; signer attested residency — filing officer must confirm");
      return { verdict: "NEEDS_REVIEW", reasons };
    }
    reasons.push("no voter-registration file in this state and no residency attestation captured");
    return { verdict: "NEEDS_REVIEW", reasons };
  }

  // --- county-fan-out: do we even hold the right county's file? ---
  if (ctx.mode === "county-fan-out") {
    const county = signer.county;
    if (!county || !ctx.loadedCounties || !ctx.loadedCounties.has(county)) {
      reasons.push(`county file not loaded (${county ?? "unknown county"}); cannot verify against an assembled-by-county state`);
      return { verdict: "NEEDS_REVIEW", reasons };
    }
    // else fall through to the normal match logic against the loaded county data
  }

  // --- voter-file-match (and county-fan-out with the county loaded) ---
  if (m.band === "NO_MATCH") {
    reasons.push("not found in voter file — signer is not a registered voter (or wrong name/address)");
    return { verdict: "INVALID", reasons };
  }
  if (m.band === "REVIEW") {
    reasons.push(`probable match (${m.score.toFixed(2)}) below auto-accept threshold — needs a second look or more identifying data`);
    return { verdict: "NEEDS_REVIEW", reasons, matchedVoterId: m.voter?.id };
  }

  // band === MATCH — now apply the legal conditions.
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
