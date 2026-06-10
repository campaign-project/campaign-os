/**
 * Moat-B flywheel demo — loader → validation engine → yield model → optimizer routing.
 *
 * Chain proven end to end:
 *   1. Synthesize distinct voters, write them in Washington's REAL pipe format, and
 *      LOAD them back through the WA adapter (load.ts) → the index is sourced via the
 *      real loader, not an in-memory shortcut.
 *   2. Simulate gatherers with different true validity (Ava 0.95, Ben 0.75, Cara 0.35)
 *      submitting batches; each batch runs through the validation engine; its observed
 *      slices feed the YieldModel.
 *   3. Watch the per-gatherer posterior converge from the 0.80 cold-start prior to each
 *      gatherer's true rate as signatures accumulate (the compounding advantage).
 *   4. Show the optimizer's hour-valuation flip: cold start can't tell gatherers apart;
 *      data-informed routing sends hours to Ava and flags Cara.
 *
 * Run: node --experimental-strip-types yielddemo.ts
 */

import { writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadVoterFile } from "../validation-engine/load.ts";
import { ADAPTERS } from "../validation-engine/sources.ts";
import { serialize, type Person } from "../validation-engine/samples.ts";
import { validateBatch } from "../validation-engine/validate.ts";
import { makeContext } from "../validation-engine/rules.ts";
import type { SignerInput, VoterRecord } from "../validation-engine/match.ts";
import { YieldModel } from "./yield.ts";

let fail = 0;
const ok = (cond: boolean, msg: string) => { console.log(`  ${cond ? "✓" : "✗"} ${msg}`); if (!cond) fail++; };
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

// ── 1. Distinct voters → WA real format → loaded back via the WA adapter ──
const FIRST = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "David", "Barbara"];
const LAST = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Taylor"];
const STREETS = ["Main St", "Oak Ave", "Pine Rd", "Maple Dr", "Cedar Ln", "Elm St", "Park Ave", "Lake Rd"];
const ZIPS = ["62701", "62704", "62705"];

const voters: Person[] = Array.from({ length: 800 }, (_, i) => ({
  voterId: `WA-${1000 + i}`, first: FIRST[i % FIRST.length], middle: "", last: LAST[(i * 7) % LAST.length], suffix: "",
  house: String(100 + i), street: STREETS[i % STREETS.length], streetAddress: `${100 + i} ${STREETS[i % STREETS.length]}`,
  unit: "", city: "Springfield", state: "WA", zip: ZIPS[i % ZIPS.length],
  status: "active", regISO: "2019-01-01", county: "King", district: "1",
}));

const waSpec = ADAPTERS["Washington"];
const file = join(tmpdir(), "wa_voters_yield.psv");
writeFileSync(file, serialize(waSpec, voters));
const loaded: VoterRecord[] = loadVoterFile(file, waSpec); // ← LOADER in the loop
rmSync(file, { force: true });

console.log("\n══════════════════════════════════════════════════════════════════");
console.log("  Moat-B flywheel — loader → validation → yield model → optimizer");
console.log("══════════════════════════════════════════════════════════════════\n");
console.log(`  loaded ${loaded.length} voters via the Washington adapter (real pipe/win-1252 format)\n`);
ok(loaded.length === 800 && loaded.every((v) => v.status === "active"), "voter index sourced through the real loader");

// ── 2–3. Train the yield model from validated batches; watch posteriors converge ──
const model = new YieldModel();
const ctx = makeContext("Washington");
let cursor = 0; // hands out distinct, unused voters to "valid" signers (no cross-batch dups)

function batch(gatherer: string, capture: "wet" | "digital", count: number, trueRate: number): SignerInput[] {
  const nValid = Math.round(count * trueRate);
  const signers: SignerInput[] = [];
  for (let i = 0; i < nValid; i++) {
    const v = loaded[cursor++];
    signers.push({ id: `${gatherer}-v${cursor}`, name: v.name, address: v.address, signedOn: "2026-05-01", gatherer, capture });
  }
  for (let i = 0; i < count - nValid; i++) {
    signers.push({ id: `${gatherer}-x${cursor}-${i}`, name: `Zqx${cursor}_${i} Nomatch`, address: `99${cursor}${i} Nowhere Blvd, Elsewhere WA 62799`, signedOn: "2026-05-01", gatherer, capture });
  }
  return signers;
}

const GATHERERS = [
  { name: "Ava", capture: "digital" as const, trueRate: 0.95 },
  { name: "Ben", capture: "wet" as const, trueRate: 0.75 },
  { name: "Cara", capture: "wet" as const, trueRate: 0.35 },
];
const INCREMENTS = [10, 20, 70, 150]; // cumulative 10 / 30 / 100 / 250 per gatherer

console.log("  per-gatherer validity: cold-start prior 0.80 → converges to true rate as signatures flow");
console.log("  gatherer (true)   n=0      n=10      n=30      n=100     n=250     source@250");
for (const g of GATHERERS) {
  const points: string[] = [`${pct(model.estimate("gatherer", g.name).rate)}(prior)`];
  for (const inc of INCREMENTS) {
    const report = validateBatch(batch(g.name, g.capture, inc, g.trueRate), loaded, { ctx });
    model.observeReport(report);
    points.push(pct(model.estimate("gatherer", g.name).rate));
  }
  const est = model.estimate("gatherer", g.name);
  console.log(`  ${`${g.name} (${g.trueRate})`.padEnd(16)} ${points.map((p) => p.padEnd(9)).join(" ")} ${est.source}`);
}

const avaE = model.estimate("gatherer", "Ava");
const caraE = model.estimate("gatherer", "Cara");
ok(avaE.rate > 0.85 && avaE.source === "observed", `Ava posterior converged to ${pct(avaE.rate)} (true 95%)`);
ok(caraE.rate < 0.5 && caraE.source === "observed", `Cara posterior converged to ${pct(caraE.rate)} (true 35%)`);
ok(model.estimate("capture", "digital").rate > 0.9, `capture-format learned: digital ${pct(model.estimate("capture", "digital").rate)}`);
ok(model.estimate("location", "62799").rate < 0.4, `location learned: ZIP 62799 (the fabricated-sig dump) ${pct(model.estimate("location", "62799").rate)}`);

// ── 4. Optimizer routing: cold start vs data-informed ──
console.log("\n  optimizer hour-valuation — same 12 raw sigs/hr, validity from the model");
console.log("  gatherer   cold-start valid/hr   data-informed valid/hr   routing signal");
const RAW_PER_HR = 12;
for (const g of GATHERERS) {
  const cold = RAW_PER_HR * model.priorRate("gatherer", g.name);
  const data = RAW_PER_HR * model.estimate("gatherer", g.name).rate;
  const signal = data >= 10 ? "↑ route here" : data >= 7 ? "ok" : "⚠ retrain / stop per-sig pay";
  console.log(`  ${g.name.padEnd(10)} ${cold.toFixed(1).padStart(14)}        ${data.toFixed(1).padStart(14)}          ${signal}`);
}
// One state's marginal value (shadow price = deficit ÷ days-to-deadline, RFC-001 §8):
const shadowPrice = 4000 / 30; // 4,000 valid short, 30 days left ≈ 133 valid/day needed
const rank = GATHERERS
  .map((g) => ({ g: g.name, valuePerHr: RAW_PER_HR * model.estimate("gatherer", g.name).rate * shadowPrice }))
  .sort((a, b) => b.valuePerHr - a.valuePerHr);
console.log(`\n  → next hour routed to ${rank[0].g} (highest valid×marginal-value); ${rank[rank.length - 1].g} flagged.`);
console.log("    Cold start values all three identically (9.6 valid/hr) — no signal. The flywheel");
console.log("    turns undifferentiated routing into 'send work where valid signatures actually come from.'");
ok(rank[0].g === "Ava" && rank[rank.length - 1].g === "Cara", "data-informed routing prefers Ava, flags Cara");

console.log(`\n  ${fail === 0 ? "ALL PASS — observations close the loop: routing improves per signature." : `${fail} FAILED`}\n`);
process.exit(fail === 0 ? 0 : 1);
