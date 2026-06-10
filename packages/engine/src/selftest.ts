/**
 * @campaign-os/engine — behavioral selftest. Run via the build's CJS emit (see README).
 * Asserts the engine's verdicts match the proven prototype, through the package's public API.
 */
import { buildIndex, validateSigner, validateBatch, makeContext, verificationMode, type VoterRecord, type SignerInput } from "./index";

const VOTERS: VoterRecord[] = [
  { id: "V001", name: "Robert A. Smith", address: "42 Main St, Springfield 62704", status: "active", registeredOn: "2019-03-01" },
  { id: "V002", name: "William Johnson", address: "88 Oak Avenue, Springfield 62704", status: "active", registeredOn: "2018-06-15" },
  { id: "V003", name: "Elizabeth Carter", address: "17 Elm Lane, Springfield 62701", status: "active", registeredOn: "2020-01-20" },
  { id: "V004", name: "James O'Brien", address: "230 N Park Rd, Springfield 62704", status: "inactive", registeredOn: "2017-09-10" },
  { id: "V005", name: "Maria Gonzalez", address: "5 Sunset Blvd Apt 4, Springfield 62705", status: "active", registeredOn: "2021-11-02" },
];

let fail = 0;
const ok = (c: boolean, m: string) => { console.log(`  ${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };

const idx = buildIndex(VOTERS);
const ctx = makeContext("Ohio");
const v = (name: string, address: string) => validateSigner({ id: "t", name, address, signedOn: "2026-05-01" }, idx, ctx);

console.log("\n@campaign-os/engine — selftest\n");
ok(v("Bob Smith", "42 Main Street, Springfield 62704").verdict === "VALID", "Bob Smith → VALID (nickname + street-type fold)");
ok(v("Maria Gonzales", "5 Sunset Blvd #4, Springfield 62705").verdict === "VALID", "Maria Gonzales → VALID (surname typo via Jaro-Winkler)");
ok(v("James O'Brien", "230 North Park Road, Springfield 62704").verdict === "INVALID", "James O'Brien → INVALID (inactive voter)");
ok(v("Katy Carter", "17 Elm Lane, Springfield 62701").verdict === "NEEDS_REVIEW", "Katy Carter → NEEDS_REVIEW (gray-band, wrong first name)");
ok(v("Gregory Fox", "1200 Hill Rd, Springfield 62704").verdict === "INVALID", "Gregory Fox → INVALID (not registered)");

ok(verificationMode("Ohio") === "voter-file-match", "verificationMode(Ohio) = voter-file-match");
ok(verificationMode("North Dakota") === "residency-only", "verificationMode(North Dakota) = residency-only");
ok(verificationMode("New Jersey") === "county-fan-out", "verificationMode(New Jersey) = county-fan-out");

const dup: SignerInput[] = [
  { id: "S1", name: "Bob Smith", address: "42 Main St, Springfield 62704", signedOn: "2026-05-01" },
  { id: "S2", name: "Robert Smith", address: "42 Main Street, Springfield 62704", signedOn: "2026-05-02" },
];
const report = validateBatch(dup, VOTERS, { ctx, requiredValid: 5 });
ok(report.valid === 1 && report.duplicates === 1, "validateBatch dedups the same voter signing twice (1 valid, 1 duplicate)");
ok(report.projection!.moreRawNeeded > 0 && !report.projection!.onTrack, "projection: more raw needed toward the requiredValid target");

console.log(`\n  ${fail === 0 ? "ALL PASS — @campaign-os/engine reproduces the proven verdicts through its public API." : `${fail} FAILED`}\n`);
process.exit(fail === 0 ? 0 : 1);
