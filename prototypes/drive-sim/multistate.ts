/**
 * Multi-state drive — the capstone. One shared volunteer pool, many states competing.
 *
 * The single-state sim (drivesim.ts) optimized within one state. A real national drive
 * runs many states at once, each with its own requirement, deadline, and voter-file
 * FORMAT, all drawing on one finite pool of gatherer-days. This adds the two things that
 * only matter across states:
 *
 *   • SHADOW-PRICE COMPETITION — each state's marginal value = remaining deficit ÷
 *     days-to-deadline (valid/day needed to stay on pace). Hours flow to the most urgent;
 *     a state on pace stops pulling. (RFC-001 §8.)
 *   • PER-(STATE × GATHERER) YIELD — validity is state-specific (a gatherer can be strong
 *     in their home state and weak elsewhere — residency, familiarity). The flywheel keys
 *     observations by `gatherer@STATE`, so routing learns WHO is good WHERE.
 *
 * Each gatherer works one state per day. Optimizer = keep every state on pace (fill by
 * shadow price), best-fit gatherers per state; naive = round-robin gatherers across open
 * states, blind to fit and urgency. Real validation per state via its real adapter; any
 * deficit at a state's deadline is bought as paid signatures.
 *
 * Run: node --experimental-strip-types multistate.ts
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
import { saveStore, loadStore } from "../optimizer/yieldstore.ts";

let fail = 0;
const ok = (c: boolean, m: string) => { console.log(`  ${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };
const money = (x: number) => `$${Math.round(x).toLocaleString()}`;
const pct = (x: number) => `${(x * 100).toFixed(0)}%`;

const BUFFER = 1.25, CPRS = 7, CAP = 8; // hrs/gatherer/day

// ── states: real requirements + adapters; compressed deadlines so routing bites ──
interface St { name: string; abbr: string; required: number; deadline: number; adapter: string; zips: string[]; voters: VoterRecord[]; ctx: any; }
const STATES: St[] = [
  { name: "Ohio", abbr: "OH", required: 5000, deadline: 10, adapter: "Ohio", zips: ["43215", "44101"], voters: [], ctx: null },
  { name: "Mississippi", abbr: "MS", required: 1000, deadline: 9, adapter: "Mississippi", zips: ["39201", "39530"], voters: [], ctx: null },
  { name: "Washington", abbr: "WA", required: 1000, deadline: 16, adapter: "Washington", zips: ["98101", "98052"], voters: [], ctx: null },
  { name: "Vermont", abbr: "VT", required: 1000, deadline: 20, adapter: "Vermont", zips: ["05401", "05602"], voters: [], ctx: null },
];

const FIRST = ["James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda", "David", "Barbara"];
const LAST = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Wilson", "Taylor"];
const STREETS = ["Main St", "Oak Ave", "Pine Rd", "Maple Dr", "Cedar Ln", "Elm St", "Park Ave", "Lake Rd"];

function loadStateVoters(s: St) {
  const spec = ADAPTERS[s.adapter];
  const n = Math.ceil(s.required * 1.2) + 500;
  const people: Person[] = Array.from({ length: n }, (_, i) => ({
    voterId: `${s.abbr}-${100000 + i}`, first: FIRST[i % FIRST.length], middle: "", last: LAST[(i * 7) % LAST.length], suffix: "",
    house: String(100 + i), street: STREETS[i % STREETS.length], streetAddress: `${100 + i} ${STREETS[i % STREETS.length]}`,
    unit: "", city: s.name, state: s.abbr, zip: s.zips[i % s.zips.length], status: "active", regISO: "2019-01-01", county: "X", district: "1",
  }));
  const f = join(tmpdir(), `ms_${s.abbr}.txt`);
  writeFileSync(f, serialize(spec, people));
  s.voters = loadVoterFile(f, spec);
  rmSync(f, { force: true });
  s.ctx = makeContext(s.name);
}
STATES.forEach(loadStateVoters);

// ── gatherers: per-state TRUE validity (some are state-specific) ──
interface G { name: string; raw: number; val: Record<string, number>; def: number; capture: "wet" | "digital"; }
const G_ = (name: string, raw: number, def: number, capture: "wet" | "digital", val: Record<string, number> = {}): G => ({ name, raw, def, capture, val });
const GATHERERS: G[] = [
  G_("Ava", 12, 0.96, "digital"), G_("Bea", 12, 0.95, "digital"),
  G_("Cy", 14, 0.92, "wet"), G_("Dot", 14, 0.90, "wet"),
  G_("Eli", 13, 0.55, "wet", { OH: 0.93 }), // OH-local: strong at home, weak away
  G_("Fay", 13, 0.55, "wet", { OH: 0.91 }),
  G_("Gus", 16, 0.55, "wet"), G_("Hal", 11, 0.60, "wet"), // fast-but-sloppy / weak
];
const trueVal = (g: G, abbr: string) => g.val[abbr] ?? g.def;
const ykey = (g: G, abbr: string) => `${g.name}@${abbr}`;

function makeSigners(g: G, s: St, cursor: { i: number }): SignerInput[] {
  const raw = CAP * g.raw, nValid = Math.round(raw * trueVal(g, s.abbr)), out: SignerInput[] = [];
  for (let i = 0; i < nValid; i++) { const v = s.voters[cursor.i++]; out.push({ id: `${g.name}-v${cursor.i}`, name: v.name, address: v.address, signedOn: "2026-05-01", gatherer: ykey(g, s.abbr), capture: g.capture }); }
  for (let i = 0; i < raw - nValid; i++) out.push({ id: `${g.name}-x${cursor.i}-${i}`, name: `Zqx${cursor.i}_${i} Nomatch`, address: `99${cursor.i}${i} Nowhere Blvd, Elsewhere ${s.abbr} 99999`, signedOn: "2026-05-01", gatherer: ykey(g, s.abbr), capture: g.capture });
  return out;
}

interface Run { collected: Record<string, number>; paidCost: number; qualified: number; model: YieldModel; assignHrs: Record<string, Record<string, number>>; }

function simulate(strategy: "naive" | "optimizer"): Run {
  const model = new YieldModel();
  const collected: Record<string, number> = Object.fromEntries(STATES.map((s) => [s.abbr, 0]));
  const cursors: Record<string, { i: number }> = Object.fromEntries(STATES.map((s) => [s.abbr, { i: 0 }]));
  const assignHrs: Record<string, Record<string, number>> = Object.fromEntries(GATHERERS.map((g) => [g.name, {}]));
  const maxDays = Math.max(...STATES.map((s) => s.deadline));

  for (let day = 0; day < maxDays; day++) {
    const open = STATES.filter((s) => day < s.deadline && collected[s.abbr] < s.required);
    if (!open.length) break;
    const paceTarget = (s: St) => Math.max(0, s.required - collected[s.abbr]) / Math.max(1, s.deadline - day); // valid/day to stay on pace

    // build today's gatherer→state assignment
    const assign: Array<{ g: G; s: St }> = [];
    if (strategy === "naive") {
      GATHERERS.forEach((g, i) => assign.push({ g, s: open[(i + day) % open.length] })); // round-robin, blind to fit + urgency
    } else {
      const ranked = open.slice().sort((a, b) => paceTarget(b) - paceTarget(a)); // by shadow price
      const free = new Set(GATHERERS);
      for (const s of ranked) {
        let need = paceTarget(s);
        const cands = [...free].sort((a, b) => b.raw * model.estimate("gatherer", ykey(b, s.abbr)).rate - a.raw * model.estimate("gatherer", ykey(a, s.abbr)).rate);
        for (const g of cands) { if (need <= 0) break; assign.push({ g, s }); free.delete(g); need -= g.raw * CAP * model.estimate("gatherer", ykey(g, s.abbr)).rate; }
      }
      for (const g of free) assign.push({ g, s: ranked[0] }); // leftover → hottest open state
    }

    // execute: validate per state via its real adapter, accumulate, observe (per state×gatherer)
    for (const { g, s } of assign) {
      const report = validateBatch(makeSigners(g, s, cursors[s.abbr]), s.voters, { ctx: s.ctx });
      model.observeReport(report);
      collected[s.abbr] += report.valid;
      assignHrs[g.name][s.abbr] = (assignHrs[g.name][s.abbr] ?? 0) + CAP;
    }
  }

  let paidCost = 0, qualified = 0;
  for (const s of STATES) {
    const gap = Math.max(0, s.required - collected[s.abbr]);
    if (gap === 0) qualified++; else paidCost += Math.ceil(gap * BUFFER) * CPRS;
  }
  return { collected, paidCost, qualified, model, assignHrs };
}

console.log("\n══════════════════════════════════════════════════════════════════");
console.log("  Multi-state drive — one pool, four states competing by shadow price");
console.log("══════════════════════════════════════════════════════════════════\n");
console.log("  states (real requirements + adapters, four file formats):");
for (const s of STATES) console.log(`    ${s.name.padEnd(13)} ${String(s.required).padStart(5)} valid · deadline d${s.deadline} · ${ADAPTERS[s.adapter].delimiter === "\t" ? "tab" : ADAPTERS[s.adapter].delimiter === "|" ? "pipe" : "comma"}/${ADAPTERS[s.adapter].encoding} · ${s.voters.length} voters loaded`);
console.log(`  pool: ${GATHERERS.length} gatherers × ${CAP}h/day = ${GATHERERS.length * CAP} gatherer-hrs/day · gap bought @ ${money(CPRS)}/sig\n`);

const naive = simulate("naive");
const opt = simulate("optimizer");

console.log("  outcome at each state's deadline:");
console.log("  state          required   naive collected      optimizer collected");
for (const s of STATES) {
  const nq = naive.collected[s.abbr] >= s.required, oq = opt.collected[s.abbr] >= s.required;
  console.log(`  ${s.name.padEnd(13)} ${String(s.required).padStart(6)}     ${String(Math.round(naive.collected[s.abbr])).padStart(7)} ${nq ? "✓" : "✗ short"}        ${String(Math.round(opt.collected[s.abbr])).padStart(7)} ${oq ? "✓" : "✗ short"}`);
}
console.log(`\n  states qualified:   naive ${naive.qualified}/4 · optimizer ${opt.qualified}/4`);
console.log(`  leftover paid bill: naive ${money(naive.paidCost)} · optimizer ${money(opt.paidCost)}`);

// per-(state×gatherer) intelligence: the OH-local gatherer
const eliOH = naive.model.estimate("gatherer", "Eli@OH").rate, eliWA = naive.model.estimate("gatherer", "Eli@WA").rate;
console.log(`\n  per-(state × gatherer) yield reveals state-specific productivity. Example — Eli:`);
console.log(`    naive's data: Eli is ${pct(eliOH)} valid in OH but ${pct(eliWA)} in WA — yet naive stationed him in both.`);
const eliHrs = opt.assignHrs["Eli"]; const eliTotal = Object.values(eliHrs).reduce((a, b) => a + b, 0);
console.log(`    optimizer kept Eli in OH (${eliHrs["OH"] ?? 0}/${eliTotal} of his hours) where he's strong, not spent at 55% elsewhere.`);

// store coda: persist the optimizer's per-state intelligence → next national drive starts warm
const STORE = join(tmpdir(), "campaignos_multistate_store.json");
rmSync(STORE, { force: true });
const saved = saveStore(STORE, opt.model, { newDrive: true, stamp: "2026-06-08" });
console.log(`\n  persisted ${Object.keys(saved.observations).length} per-(state×gatherer/location/format) slices to the store —`);
console.log(`  the next national drive starts warm with this map of who's productive where.`);
rmSync(STORE, { force: true });

console.log(`\n  → Same pool, same deadlines. Shadow-price routing keeps every state on pace and best-fits`);
console.log(`    gatherers per state; round-robin starves the big/urgent state (OH) while over-serving small`);
console.log(`    ones, then can't recover by deadline. This is the national portfolio version of the cost`);
console.log(`    model's routing thesis — the lever that keeps the whole map under the <$1M budget.\n`);

ok(STATES.every((s) => s.voters.length > 0), "all four states loaded via their real adapters (4 formats)");
ok(opt.paidCost < naive.paidCost, `optimizer's leftover paid bill is smaller (${money(opt.paidCost)} vs ${money(naive.paidCost)})`);
ok(opt.qualified >= naive.qualified, `optimizer qualifies at least as many states (${opt.qualified} vs ${naive.qualified})`);
ok(eliOH > eliWA + 0.15, `flywheel learned Eli is state-specific (OH ${pct(eliOH)} ≫ WA ${pct(eliWA)})`);
ok((eliHrs["OH"] ?? 0) > eliTotal / 2, "optimizer concentrated the OH-local gatherer in OH");

console.log(`\n  ${fail === 0 ? "ALL PASS — national routing: states compete by shadow price, yield is learned per state." : `${fail} FAILED`}\n`);
process.exit(fail === 0 ? 0 : 1);
