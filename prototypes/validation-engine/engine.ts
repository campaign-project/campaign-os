/**
 * Validation Engine — prototype (CampaignOS, RFC-001 §5 validation layer).
 *
 * Predicts petition-signature validity BEFORE submission by matching each signer to
 * the registered-voter file and applying per-state validity law. Outputs the count
 * that is SAFE TO SUBMIT (VALID only), plus yield intelligence (validity by gatherer
 * / location / capture — Moat B) and a "how much more to gather" projection.
 *
 * Run (Node >= 22.6, no install):
 *   node --experimental-strip-types engine.ts            # full demo
 *   node --experimental-strip-types engine.ts --selftest # matcher assertions, offline
 *
 * Deterministic, NO network, NO LLM — the verdict is math over records, so it can
 * gate a legal bright line without hallucinating a "valid."
 */

import { jaroWinkler, matchSigner, buildIndex } from "./match.ts";
import { normName, normAddress } from "./normalize.ts";
import { makeContext } from "./rules.ts";
import { validateBatch, type BatchReport } from "./validate.ts";
import { VOTERS, SIGNERS, ND_SIGNERS, NJ_VOTERS, NJ_SIGNERS } from "./fixtures.ts";

const ICON = { VALID: "🟢", INVALID: "🔴", NEEDS_REVIEW: "🟡" } as const;
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

function printReport(r: BatchReport) {
  console.log(`\n  ── ${r.jurisdiction} · mode: ${r.mode} ──`);
  console.log(`  ${r.total} signatures → 🟢 ${r.valid} valid · 🔴 ${r.invalid} invalid · 🟡 ${r.review} need review` + (r.duplicates ? ` (incl. ${r.duplicates} duplicates)` : ""));
  console.log(`  predicted validity rate: ${pct(r.validityRate)}\n`);

  console.log("  signer ledger");
  for (const row of r.ledger) {
    const s = row.signer;
    console.log(`    ${ICON[row.verdict]} ${s.id} ${s.name.padEnd(18)} ${row.score ? `score ${row.score.toFixed(2)}` : "        "}  ${row.reasons[0]}`);
  }

  console.log("\n  yield intelligence (Moat B — feeds the optimizer's priors)");
  console.log("    by gatherer:  " + r.byGatherer.map((g) => `${g.key} ${pct(g.rate)} (${g.valid}/${g.total})`).join("  ·  "));
  console.log("    by location:  " + r.byLocation.map((g) => `${g.key} ${pct(g.rate)} (${g.valid}/${g.total})`).join("  ·  "));
  console.log("    by capture:   " + r.byCapture.map((g) => `${g.key} ${pct(g.rate)} (${g.valid}/${g.total})`).join("  ·  "));

  if (r.projection) {
    const p = r.projection;
    console.log("\n  projection");
    console.log(`    need ${p.requiredValid} VALID (target ${p.targetRaw} raw @ ${p.buffer}× buffer); safe-to-submit now: ${p.safeToSubmit}`);
    if (p.onTrack) console.log(`    ✅ threshold met — stop gathering here, reallocate effort.`);
    else console.log(`    → at the observed ${pct(r.validityRate)} rate, gather ~${p.moreRawNeeded} more raw signatures to clear the bar.`);
  }
}

// ----------------------------------------------------------------------------
// Self-test — proves the matcher's core behaviors offline. Exits non-zero on fail.
// ----------------------------------------------------------------------------

function selftest() {
  let fail = 0;
  const ok = (cond: boolean, msg: string) => { console.log(`    ${cond ? "✓" : "✗"} ${msg}`); if (!cond) fail++; };
  const approx = (a: number, b: number, eps = 0.02) => Math.abs(a - b) < eps;

  console.log("  normalization");
  ok(normName("Bob Smith").first === "robert", "nickname Bob → robert");
  ok(normName("Smith, Robert A.").last === "smith" && normName("Smith, Robert A.").first === "robert", "‘Last, First M.’ parsed");
  ok(normAddress("42 Main Street").number === "42" && normAddress("42 Main Street").street === "main st", "street-type fold Street → st");
  ok(normAddress("5 Sunset Blvd #4, Springfield 62705").unit === "4" && normAddress("5 Sunset Blvd #4, Springfield 62705").zip5 === "62705", "unit + zip parsed");

  console.log("  jaro-winkler");
  ok(jaroWinkler("gonzalez", "gonzales") > 0.9, "Gonzalez ~ Gonzales > 0.9");
  ok(jaroWinkler("smith", "smyth") > 0.8, "Smith ~ Smyth > 0.8");
  ok(jaroWinkler("smith", "jones") < 0.5, "Smith ≁ Jones < 0.5");

  console.log("  matcher");
  const idx = buildIndex(VOTERS);
  const m1 = matchSigner({ id: "t1", name: "Bob Smith", address: "42 Main Street, Springfield 62704" }, idx);
  ok(m1.band === "MATCH" && m1.voter?.id === "V001", "Bob Smith / 42 Main Street → MATCH V001");
  const m2 = matchSigner({ id: "t2", name: "Robert Smith", address: "44 Main St, Springfield 62704" }, idx);
  ok(m2.band !== "MATCH", "Robert Smith / 44 Main St (wrong house #) → not a confident MATCH");
  const m3 = matchSigner({ id: "t3", name: "Gregory Fox", address: "1200 Hill Rd, Springfield 62704" }, idx);
  ok(m3.band === "NO_MATCH", "Gregory Fox (not in file) → NO_MATCH");
  const m4 = matchSigner({ id: "t4", name: "Katy Carter", address: "17 Elm Lane, Springfield 62701" }, idx);
  ok(m4.band === "REVIEW", "Katy Carter (right house, wrong first name) → REVIEW (gray band)");

  console.log(`\n  ${fail === 0 ? "ALL PASS" : `${fail} FAILED`}`);
  process.exit(fail === 0 ? 0 : 1);
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

if (process.argv.includes("--selftest")) {
  console.log("\nValidation Engine — self-test\n");
  selftest();
}

console.log("\n══════════════════════════════════════════════════════════════════");
console.log("  CampaignOS Validation Engine — prototype");
console.log("  Predict signature validity before submission · deterministic · no-LLM");
console.log("══════════════════════════════════════════════════════════════════");

// 1) Normal case: statewide petition in a voter-file-match state (Ohio = real
//    mapped record → free-download tier; voter rows below are synthetic).
const ctxOH = makeContext("Ohio");
console.log(`\n  state record (live from verified master): voter-file tier = ${ctxOH.voterFileTier ?? "n/a"}`);
const ohio = validateBatch(SIGNERS, VOTERS, { ctx: ctxOH, requiredValid: 10, buffer: 1.25 });
printReport(ohio);

// 2) residency-only exception: North Dakota has NO voter registration.
console.log("\n──────────────────────────────────────────────────────────────────");
console.log("  EXCEPTION — North Dakota (no voter registration exists)");
const nd = validateBatch(ND_SIGNERS, [], { ctx: makeContext("North Dakota") });
printReport(nd);

// 3) county-fan-out exception: New Jersey, only Essex county file loaded.
console.log("\n──────────────────────────────────────────────────────────────────");
console.log("  EXCEPTION — New Jersey (assembled county-by-county; only Essex loaded)");
const nj = validateBatch(NJ_SIGNERS, NJ_VOTERS, { ctx: makeContext("New Jersey", { loadedCounties: new Set(["Essex"]) }) });
printReport(nj);

console.log("\n  Note: NEEDS_REVIEW is never counted as safe-to-submit — the bright line.");
console.log("  A false VALID risks the ballot line; a false REVIEW only costs a second look.\n");
