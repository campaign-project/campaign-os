/**
 * Loader demo — proves the per-state adapters end to end, for free, with no PII.
 *
 *   1. Serialize fabricated people into all 7 free states' REAL formats (samples.ts).
 *   2. Load each back through its adapter (load.ts + sources.ts) → canonical records.
 *   3. Assert the canonical invariants per state (this doubles as the loader's test).
 *   4. Run the full validation engine on the loaded Washington file (pipe-delimited,
 *      split address, ISO dates) — load → match → validity, all the way through.
 *
 * Run: node --experimental-strip-types loaddemo.ts
 * When the team downloads a real file via the mapped URL, the SAME adapter parses it.
 */

import { loadVoterFile } from "./load.ts";
import { ADAPTERS } from "./sources.ts";
import { writeSamples } from "./samples.ts";
import { buildIndex, matchSigner, type SignerInput } from "./match.ts";
import { validateBatch } from "./validate.ts";
import { makeContext } from "./rules.ts";

const ICON = { VALID: "🟢", INVALID: "🔴", NEEDS_REVIEW: "🟡" } as const;
let fail = 0;
const ok = (cond: boolean, msg: string) => { if (!cond) { fail++; console.log(`      ✗ ${msg}`); } };

console.log("\n══════════════════════════════════════════════════════════════════");
console.log("  CampaignOS Validation Engine — per-state voter-file loader");
console.log("  7 free-access states · real layouts · synthetic samples (no PII)");
console.log("══════════════════════════════════════════════════════════════════\n");

const paths = writeSamples();
const loaded: Record<string, ReturnType<typeof loadVoterFile>> = {};

for (const [jur, spec] of Object.entries(ADAPTERS)) {
  const recs = loadVoterFile(paths[jur], spec);
  loaded[jur] = recs;
  const r0 = recs[0];
  const delimName = spec.delimiter === "\t" ? "tab" : spec.delimiter === "|" ? "pipe" : "comma";
  const conf = spec.confidence === "low" ? " ⚠ low-confidence" : "";
  console.log(`  ${jur}  [${delimName} · ${spec.encoding} · ${spec.hasHeader ? "header" : "positional"} · ${spec.dateFormat}]${conf}`);
  console.log(`     parsed ${recs.length} records → e.g. ${r0.id} | "${r0.name}" | ${r0.address} | ${r0.status} | reg ${r0.registeredOn ?? "—"}`);

  // per-state invariants
  ok(recs.length === 5, `${jur}: parsed all 5 rows (got ${recs.length})`);
  ok(!!r0.id && r0.id !== "undefined", `${jur}: record has an id`);
  ok(/nu(ñ|n)ez/i.test(r0.name) === false || /nuñez/i.test(r0.name), `${jur}: name composed`);
  ok(/robert/i.test(r0.name) && /nu[ñn]ez/i.test(r0.name), `${jur}: first+last present in name`);
  ok(loaded[jur].some((r) => r.status === "active"), `${jur}: at least one active voter`);
  ok(loaded[jur].some((r) => r.status === "cancelled"), `${jur}: cancelled status normalized (Katherine Lee)`);
  if (spec.dateFormat !== "unknown") ok(/^\d{4}-\d{2}-\d{2}$/.test(r0.registeredOn ?? ""), `${jur}: date parsed to ISO (${r0.registeredOn})`);
  else ok(r0.registeredOn === undefined, `${jur}: unknown date format → registeredOn left blank (caveat honored)`);
}

// NC specifically must have round-tripped the ñ through Windows-1252.
ok(/nuñez/i.test(loaded["North Carolina"][0].name), "North Carolina: ñ survived the Windows-1252 decode");

console.log("\n  ── end-to-end: validate a petition batch against the LOADED Washington file ──");
const waVoters = loaded["Washington"]; // parsed from a pipe-delimited, ISO-date, split-address file
const signers: SignerInput[] = [
  { id: "S1", name: "Bob Nunez", address: "42 Main Street, Springfield 62704", signedOn: "2026-05-01", gatherer: "Ava", capture: "digital" }, // → V1001 (nickname + ñ→n + St fold) VALID
  { id: "S2", name: "Will Johnson", address: "88 Oak Ave, Springfield 62704", signedOn: "2026-05-01", gatherer: "Ava", capture: "wet" }, // → V1002 VALID
  { id: "S3", name: "James O'Brien", address: "230 North Park Road, Springfield 62704", signedOn: "2026-05-02", gatherer: "Ben", capture: "wet" }, // → V1004 INACTIVE → INVALID
  { id: "S4", name: "Gregory Fox", address: "1200 Hill Rd, Springfield 62704", signedOn: "2026-05-03", gatherer: "Ben", capture: "wet" }, // not in file → INVALID
];
const report = validateBatch(signers, waVoters, { ctx: makeContext("Washington"), requiredValid: 3 });
for (const row of report.ledger) {
  console.log(`     ${ICON[row.verdict]} ${row.signer.id} ${row.signer.name.padEnd(16)} ${row.reasons[0]}`);
}
console.log(`     → ${report.valid} valid / ${report.invalid} invalid / ${report.review} review · validity ${(report.validityRate * 100).toFixed(0)}%`);
ok(report.valid === 2 && report.invalid === 2, `Washington end-to-end: 2 valid (Bob Nunez, Will Johnson), 2 invalid (inactive O'Brien, unregistered Fox)`);

console.log(`\n  ${fail === 0 ? "ALL CHECKS PASS — 7 real formats → one canonical record → validated end-to-end." : `${fail} CHECK(S) FAILED`}\n`);
process.exit(fail === 0 ? 0 : 1);
