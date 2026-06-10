/**
 * Cross-drive yield store demo — the flywheel made durable.
 *
 *   Drive 1 (cold) → learns gatherer validity via the real validation engine → PERSIST
 *   round-trip      → reload the store; estimates survive
 *   warm vs cold    → a model warmed from the store routes AWAY from the trap gatherer on
 *                     DAY 1; a cold model is fooled by her raw volume and wastes hours
 *   Drive 2 (warm)  → observations ADD to the store; Cara's evidence compounds, posterior tightens
 *
 * Run: node --experimental-strip-types yieldstoredemo.ts
 */

import { rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadVoterFile } from "../validation-engine/load.ts";
import { ADAPTERS } from "../validation-engine/sources.ts";
import { serialize, type Person } from "../validation-engine/samples.ts";
import { validateBatch } from "../validation-engine/validate.ts";
import { makeContext } from "../validation-engine/rules.ts";
import type { SignerInput, VoterRecord } from "../validation-engine/match.ts";
import { YieldModel } from "./yield.ts";
import { warmModel, saveStore, loadStore } from "./yieldstore.ts";

let fail = 0;
const ok = (c: boolean, m: string) => { console.log(`  ${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const STAMP = "2026-06-07"; // fixed for deterministic output

interface G { name: string; raw: number; validity: number; capture: "wet" | "digital"; cap: number; }
const GATHERERS: G[] = [
  { name: "Ava", raw: 12, validity: 0.95, capture: "digital", cap: 16 },
  { name: "Ben", raw: 14, validity: 0.75, capture: "wet", cap: 16 },
  { name: "Dee", raw: 12, validity: 0.90, capture: "wet", cap: 16 },
  { name: "Cara", raw: 16, validity: 0.35, capture: "wet", cap: 16 }, // trap: most raw, least valid
];
const HOURS_PER_DAY = 40;

// voters → real WA format → loaded via the adapter (loader in the loop)
const FIRST = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "David", "Barbara"];
const LAST = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Taylor"];
const STREETS = ["Main St", "Oak Ave", "Pine Rd", "Maple Dr", "Cedar Ln", "Elm St", "Park Ave", "Lake Rd"];
const ZIPS = ["98101", "98052", "98004"];
const waSpec = ADAPTERS["Washington"];
const vfile = join(tmpdir(), "wa_voters_store.psv");
writeFileSync(vfile, serialize(waSpec, Array.from({ length: 2500 }, (_, i): Person => ({
  voterId: `WA-${200000 + i}`, first: FIRST[i % FIRST.length], middle: "", last: LAST[(i * 7) % LAST.length], suffix: "",
  house: String(100 + i), street: STREETS[i % STREETS.length], streetAddress: `${100 + i} ${STREETS[i % STREETS.length]}`,
  unit: "", city: "Seattle", state: "WA", zip: ZIPS[i % ZIPS.length], status: "active", regISO: "2019-01-01", county: "King", district: "1",
}))));
const voters: VoterRecord[] = loadVoterFile(vfile, waSpec);
rmSync(vfile, { force: true });
const ctx = makeContext("Washington");

// run one drive's worth of real captures (one batch per gatherer at its true validity) → observe
function runDrive(model: YieldModel, countPerGatherer: number) {
  const cursor = { i: 0 };
  const signers: SignerInput[] = [];
  for (const g of GATHERERS) {
    const nValid = Math.round(countPerGatherer * g.validity);
    for (let i = 0; i < nValid; i++) { const v = voters[cursor.i++]; signers.push({ id: `${g.name}-v${cursor.i}`, name: v.name, address: v.address, signedOn: "2026-05-01", gatherer: g.name, capture: g.capture }); }
    for (let i = 0; i < countPerGatherer - nValid; i++) signers.push({ id: `${g.name}-x${cursor.i}-${i}`, name: `Zqx${cursor.i}_${i} Nomatch`, address: `99${cursor.i}${i} Nowhere Blvd, Elsewhere WA 99999`, signedOn: "2026-05-01", gatherer: g.name, capture: g.capture });
  }
  model.observeReport(validateBatch(signers, voters, { ctx }));
}

// day-1 routing: greedy by raw-rate × current validity belief, capped (mirrors drivesim)
function allocate(model: YieldModel): Record<string, number> {
  const ranked = [...GATHERERS].sort((a, b) => b.raw * model.estimate("gatherer", b.name).rate - a.raw * model.estimate("gatherer", a.name).rate);
  const alloc: Record<string, number> = Object.fromEntries(GATHERERS.map((g) => [g.name, 0]));
  let budget = HOURS_PER_DAY;
  for (const g of ranked) { const give = Math.min(g.cap, budget); alloc[g.name] = give; budget -= give; if (budget <= 0) break; }
  return alloc;
}
const fmtAlloc = (a: Record<string, number>) => GATHERERS.map((g) => `${g.name}:${a[g.name]}h`).join("  ");

console.log("\n══════════════════════════════════════════════════════════════════");
console.log("  Cross-drive yield store — the Moat-B flywheel, made durable");
console.log("══════════════════════════════════════════════════════════════════\n");

const STORE = join(tmpdir(), "campaignos_yieldstore_demo.json");
rmSync(STORE, { force: true }); // start with no prior knowledge
console.log(`  loaded ${voters.length.toLocaleString()} voters via the WA adapter · store: (none yet)\n`);

// ── Drive 1: cold start → learn → persist ──
const m1 = warmModel(STORE); // empty store → cold
ok(m1.estimate("gatherer", "Cara").source === "prior", "Drive 1 starts COLD (Cara at the prior, nothing learned yet)");
runDrive(m1, 300);
const saved1 = saveStore(STORE, m1, { newDrive: true, stamp: STAMP });
console.log("  Drive 1 (cold) learned: " + GATHERERS.map((g) => `${g.name} ${pct(m1.estimate("gatherer", g.name).rate)}`).join(" · "));
console.log(`  → persisted to the store (drive ${saved1.drives}).\n`);

// ── round-trip: reload, estimates survive ──
const reloaded = warmModel(STORE);
ok(Math.abs(reloaded.estimate("gatherer", "Cara").rate - m1.estimate("gatherer", "Cara").rate) < 1e-9, "round-trip: reloaded store reproduces the learned estimates exactly");
ok(reloaded.estimate("gatherer", "Cara").source !== "prior", "a model warmed from the store is no longer at the cold-start prior");

// ── the payoff: warm vs cold DAY-1 routing ──
const cold = new YieldModel(); // a brand-new drive with NO store
const warm = warmModel(STORE); // a brand-new drive that inherits the store
const aCold = allocate(cold), aWarm = allocate(warm);
console.log("  next drive, DAY 1 routing of 40 volunteer-hrs:");
console.log(`    cold start (no store):  ${fmtAlloc(aCold)}   ← fooled by Cara's raw volume`);
console.log(`    warm  (from store):     ${fmtAlloc(aWarm)}   ← already knows Cara is ${pct(warm.estimate("gatherer", "Cara").rate)}`);
const taxAvoided = aCold["Cara"] - aWarm["Cara"];
console.log(`  → carrying knowledge across drives skips ${taxAvoided} gatherer-hrs the cold model wastes re-`);
console.log(`    discovering the trap. The learning tax is paid ONCE, ever — not every drive.\n`);
ok(aCold["Cara"] > 0 && aWarm["Cara"] < aCold["Cara"], `warm day-1 routing avoids the trap gatherer (${aWarm["Cara"]}h vs cold ${aCold["Cara"]}h)`);

// ── Drive 2: warm → observations ADD → posterior compounds ──
const m2 = warmModel(STORE);
const nBefore = m2.estimate("gatherer", "Cara").n;
runDrive(m2, 300);
const saved2 = saveStore(STORE, m2, { newDrive: true, stamp: STAMP });
const nAfter = m2.estimate("gatherer", "Cara").n;
console.log(`  Drive 2 (warm): Cara evidence ${nBefore} → ${nAfter} signatures (drive 1 + drive 2 accumulated).`);
ok(nAfter > nBefore, `Drive 2 observations COMPOUNDED onto Drive 1 (Cara n: ${nBefore} → ${nAfter})`);
ok(saved2.drives === 2, `store drive counter advanced to ${saved2.drives}`);

const store = loadStore(STORE);
console.log(`\n  store now: ${Object.keys(store.observations).length} slices across ${store.drives} drives, updated ${store.updatedAt}.`);
console.log(`  Cara accumulated: ${JSON.stringify(store.observations["gatherer:Cara"])} → posterior ${pct(warmModel(STORE).estimate("gatherer", "Cara").rate)}.`);
rmSync(STORE, { force: true });

console.log(`\n  ${fail === 0 ? "ALL PASS — the flywheel persists: every drive starts warmer, the moat compounds." : `${fail} FAILED`}\n`);
process.exit(fail === 0 ? 0 : 1);
