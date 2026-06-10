/**
 * End-to-end drive simulation — the whole CampaignOS stack as one narrative.
 *
 * Qualifies a pilot state (Ohio: 5,000 valid sigs, grounded in verified-rules.master)
 * by running every layer together, day by day:
 *
 *   optimizer  → routes a fixed volunteer-hour pool across gatherers by expected VALID
 *                signatures/hour (= raw-rate × the yield model's current validity belief)
 *   gather     → each routed gatherer-hour produces raw signatures
 *   loader     → voters loaded through the real Ohio adapter (free instant-download tier)
 *   validation → every captured signature scored against that voter file (match + law)
 *   yield      → observed validity feeds the Beta-Binomial model → tomorrow's routing
 *   cost       → any gap at the deadline is bought as paid signatures
 *
 * The point: a TRAP gatherer (Cara) has the HIGHEST raw output but the LOWEST validity.
 * A cold-start optimizer is fooled by her volume (prior says ~80% for everyone); the
 * yield flywheel discovers within a day that her signatures don't survive and reroutes.
 * We run the same scenario two ways — naive even-split vs optimizer+yield — and show the
 * learning routing qualifies Ohio for $0 paid while naive leaves a paid gap.
 *
 * Run: node --experimental-strip-types drivesim.ts
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
import { YieldModel } from "../optimizer/yield.ts";

let fail = 0;
const ok = (c: boolean, m: string) => { console.log(`  ${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;
const money = (x: number) => `$${Math.round(x).toLocaleString()}`;

// ── Grounded pilot-state parameters (Ohio, from verified-rules.master.json) ──
const STATE = "Ohio";
const TARGET = 5000; // "5,000 valid (max 15,000)" — verified headline
const DEADLINE_DAYS = 12; // a tight window so routing quality actually matters
const HOURS_PER_DAY = 40; // local volunteer-hour pool
const BUFFER = 1.25; // raw-to-valid safety multiplier
const CPRS = 7; // $/required signature to buy any deadline gap (mid, Ballotpedia-grounded)

// ── Ground-truth gatherers (the SIM knows these; the optimizer must LEARN them) ──
interface Gatherer { name: string; raw: number; validity: number; capture: "wet" | "digital"; cap: number; }
const GATHERERS: Gatherer[] = [
  { name: "Ava", raw: 12, validity: 0.95, capture: "digital", cap: 16 },
  { name: "Ben", raw: 14, validity: 0.75, capture: "wet", cap: 16 },
  { name: "Dee", raw: 12, validity: 0.90, capture: "wet", cap: 16 },
  { name: "Cara", raw: 16, validity: 0.35, capture: "wet", cap: 16 }, // TRAP: most raw, least valid
];

// ── 1. Synthesize voters → write in Ohio's REAL format → load via the OH adapter ──
const FIRST = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "David", "Barbara"];
const LAST = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Taylor"];
const STREETS = ["Main St", "Oak Ave", "Pine Rd", "Maple Dr", "Cedar Ln", "Elm St", "Park Ave", "Lake Rd"];
const ZIPS = ["43004", "43017", "43215", "44101", "45202"]; // real-ish OH ZIPs
const POOL = 11000;
const people: Person[] = Array.from({ length: POOL }, (_, i) => ({
  voterId: `OH-${100000 + i}`, first: FIRST[i % FIRST.length], middle: "", last: LAST[(i * 7) % LAST.length], suffix: "",
  house: String(100 + i), street: STREETS[i % STREETS.length], streetAddress: `${100 + i} ${STREETS[i % STREETS.length]}`,
  unit: "", city: "Columbus", state: "OH", zip: ZIPS[i % ZIPS.length],
  status: "active", regISO: "2019-01-01", county: "Franklin", district: "3",
}));
const ohSpec = ADAPTERS["Ohio"];
const file = join(tmpdir(), "oh_voters_drivesim.csv");
writeFileSync(file, serialize(ohSpec, people));
const voters: VoterRecord[] = loadVoterFile(file, ohSpec); // ← loader in the loop (OH comma/utf-8 format)
rmSync(file, { force: true });

const ctx = makeContext(STATE);

console.log("\n══════════════════════════════════════════════════════════════════");
console.log(`  CampaignOS drive simulation — qualify ${STATE} (${TARGET.toLocaleString()} valid sigs)`);
console.log("  optimizer → gather → validation → yield → cost, day by day");
console.log("══════════════════════════════════════════════════════════════════");
console.log(`\n  loaded ${voters.length.toLocaleString()} voters via the Ohio adapter (free-download tier, verified ${ohSpec.verifiedAsOf})`);
console.log(`  window: ${DEADLINE_DAYS} days · ${HOURS_PER_DAY} volunteer-hrs/day · deadline gap bought @ ${money(CPRS)}/required-sig\n`);

// ── allocation strategies ──
function allocNaive(): Record<string, number> {
  const per = HOURS_PER_DAY / GATHERERS.length;
  return Object.fromEntries(GATHERERS.map((g) => [g.name, Math.min(per, g.cap)]));
}
function allocOptimizer(model: YieldModel): Record<string, number> {
  // value = raw-rate × current validity belief; greedily fill highest-value gatherers to cap.
  const ranked = [...GATHERERS].sort((a, b) => b.raw * model.estimate("gatherer", b.name).rate - a.raw * model.estimate("gatherer", a.name).rate);
  const alloc: Record<string, number> = Object.fromEntries(GATHERERS.map((g) => [g.name, 0]));
  let budget = HOURS_PER_DAY;
  for (const g of ranked) { const give = Math.min(g.cap, budget); alloc[g.name] = give; budget -= give; if (budget <= 0) break; }
  return alloc;
}

// ── one day's captures → validation report ──
function dayBatch(alloc: Record<string, number>, cursor: { i: number }, day: number): SignerInput[] {
  const signers: SignerInput[] = [];
  for (const g of GATHERERS) {
    const hrs = alloc[g.name];
    if (!hrs) continue;
    const raw = Math.round(hrs * g.raw);
    const nValid = Math.round(raw * g.validity);
    for (let i = 0; i < nValid; i++) {
      const v = voters[cursor.i++];
      signers.push({ id: `${g.name}-d${day}-v${i}`, name: v.name, address: v.address, signedOn: "2026-05-01", gatherer: g.name, capture: g.capture });
    }
    for (let i = 0; i < raw - nValid; i++) {
      signers.push({ id: `${g.name}-d${day}-x${i}`, name: `Zqx${cursor.i}_${i} Nomatch`, address: `99${cursor.i}${i} Nowhere Blvd, Elsewhere OH 43999`, signedOn: "2026-05-01", gatherer: g.name, capture: g.capture });
    }
  }
  return signers;
}

interface Result { valid: number; hours: number; days: number; caraHours: number; paidValid: number; cost: number; model: YieldModel; snapshots: string[]; }

function simulate(strategy: "naive" | "optimizer"): Result {
  const model = new YieldModel();
  const cursor = { i: 0 };
  let valid = 0, hours = 0, caraHours = 0, day = 0;
  const snapshots: string[] = [];
  while (valid < TARGET && day < DEADLINE_DAYS) {
    day++;
    const alloc = strategy === "naive" ? allocNaive() : allocOptimizer(model);
    const report = validateBatch(dayBatch(alloc, cursor, day), voters, { ctx });
    model.observeReport(report); // both observe; only the optimizer ROUTES on it
    valid += report.valid;
    hours += Object.values(alloc).reduce((a, b) => a + b, 0);
    caraHours += alloc["Cara"] ?? 0;
    if (strategy === "optimizer" && day <= 5) {
      const a = GATHERERS.map((g) => `${g.name[0]}:${alloc[g.name].toFixed(0)}h`).join(" ");
      const learned = GATHERERS.map((g) => `${g.name[0]} ${pct(model.estimate("gatherer", g.name).rate)}`).join(" ");
      snapshots.push(`    day ${day}: route[${a}]  valid+${report.valid}  learned[${learned}]`);
    }
  }
  const paidValid = Math.max(0, TARGET - valid);
  const cost = Math.ceil(paidValid * BUFFER) * CPRS;
  return { valid, hours, days: day, caraHours, paidValid, cost, model, snapshots };
}

const naive = simulate("naive");
const opt = simulate("optimizer");

console.log("  optimizer+yield — daily routing as it learns (note day 1: Cara's raw volume fools the cold start):");
for (const s of opt.snapshots) console.log(s);
console.log(`    … by day ${opt.days} the model knows Cara ≈ ${pct(opt.model.estimate("gatherer", "Cara").rate)}, Ava ≈ ${pct(opt.model.estimate("gatherer", "Ava").rate)} and routes accordingly.\n`);

console.log("  outcome after the 12-day window:");
console.log("  strategy          valid gathered   volunteer-hrs   hrs on Cara(trap)   paid gap        cost");
const validShown = (r: Result) => (r.paidValid === 0 ? `${TARGET}+ ✓` : `${TARGET - r.paidValid}`);
console.log(`  naive (even split) ${validShown(naive).padStart(9)}        ${String(naive.hours).padStart(5)}h         ${String(naive.caraHours).padStart(5)}h            ${String(naive.paidValid).padStart(5)} sigs   ${money(naive.cost).padStart(8)}`);
console.log(`  optimizer + yield  ${validShown(opt).padStart(9)}        ${String(opt.hours).padStart(5)}h         ${String(opt.caraHours).padStart(5)}h            ${String(opt.paidValid).padStart(5)} sigs   ${money(opt.cost).padStart(8)}`);

console.log(`\n  → Same 4 volunteers, same 12-day deadline. Validity-aware routing qualified ${STATE} for ${money(opt.cost)}`);
console.log(`    (paid gap ${opt.paidValid} sigs); even-split left a ${money(naive.cost)} paid gap (${naive.paidValid} sigs short) by`);
console.log(`    burning ${naive.caraHours - opt.caraHours}h on the trap gatherer the flywheel learned to avoid.`);
console.log(`    This is the cost model's national $267K→$189 result (RFC-001 §8) at the per-state level —`);
console.log(`    now driven by REAL validation + learned yield, not assumed rates. ${STATE}'s cost is a rounding`);
console.log(`    error against the <$1M national budget; the method is what makes the expensive states fit.\n`);

// ── assertions ──
ok(voters.length === POOL && voters.every((v) => v.status === "active"), "voters loaded through the real Ohio adapter");
ok(opt.model.estimate("gatherer", "Cara").rate < 0.5, `flywheel learned Cara is low-validity (${pct(opt.model.estimate("gatherer", "Cara").rate)})`);
ok(opt.caraHours < naive.caraHours, `optimizer routed FEWER hours to the trap gatherer (${opt.caraHours}h vs ${naive.caraHours}h)`);
ok(opt.cost < naive.cost, `optimizer+yield qualified cheaper (${money(opt.cost)} vs ${money(naive.cost)})`);
ok(opt.paidValid === 0, `optimizer+yield hit the ${TARGET.toLocaleString()} target with no paid gap`);

console.log(`  ${fail === 0 ? "ALL PASS — the full stack qualifies a state end to end, and learning routing beats naive." : `${fail} FAILED`}\n`);
process.exit(fail === 0 ? 0 : 1);
