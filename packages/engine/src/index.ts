/**
 * @campaign-os/engine — the signature-validation engine.
 *
 * The single source of truth for "will this signature count?", shared by the server and the
 * React Native field app (RFC-002). Pure + framework-agnostic: no platform deps, so the SAME
 * code validates on-device (offline, against the synced per-geography index) and server-side.
 *
 * App (per capture):   validateSigner(signer, index, ctx)
 * Server (bulk):       validateBatch(signers, voters, { ctx, requiredValid })
 * Index:               buildIndex(votersForGeography)
 * Context:             makeContext(jurisdiction, { voterFileTier, loadedCounties, ... })
 */

export { basic, normName, normAddress, standardizeAddress, deterministicStandardizer } from "./normalize";
export type { NormName, NormAddress } from "./normalize";
export { STREET_SUFFIXES, DIRECTIONALS } from "./standardize";
export type { StandardizedAddress, AddressStandardizer } from "./standardize";

export { buildIndex, matchSigner, jaroWinkler, MATCH_AT, REVIEW_AT } from "./match";
export type { VoterRecord, SignerInput, MatchBand, MatchResult, VoterIndex } from "./match";

export { verificationMode, makeContext, evaluate } from "./rules";
export type { VerificationMode, Verdict, StateContext, ValidityResult } from "./rules";

export { validateSigner, validateBatch } from "./validate";
export type { SignerVerdict, SignerLedgerRow, SliceStat, BatchReport, ValidateOpts } from "./validate";

export { suggestVoters } from "./suggest";

export { newFilter, addMember, sealFilter, loadFilter, isMember } from "./membership";
export type { MembershipFilter, LoadedFilter } from "./membership";
