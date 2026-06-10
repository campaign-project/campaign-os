/**
 * CampaignOS — Ballot-Access Optimizer (prototype, RFC-001 §7–8)
 *
 * Objective (from the cost model): minimize the cost / time to qualify nationally by routing
 * volunteer-hours to maximize VALID signatures per hour, weighted by each jurisdiction's
 * deadline-risk. Three things:
 *   1. Marginal-value board  — per-state shadow price (deficit ÷ days-to-deadline); where to send help.
 *   2. Next-best-move        — for one volunteer: the highest-value opportunity in their reach.
 *   3. Optimizer vs. naive   — same volunteer-hours, allocated by marginal value vs. uniformly;
 *                              compare states-qualified-on-time and the leftover PAID cost.
 *
 * Grounded: per-state signature requirements + deadlines from the verified data. Modeled (labeled):
 * the drive's current progress, yield-per-hour priors (RFC-001 §7.4), and absorption caps.
 *
 * Run:  node --experimental-strip-types optimize.ts
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const master = JSON.parse(readFileSync(join(HERE, "../../ballot-access-data/verified-rules.master.json"), "utf8"));

// ── grounded: controlling statewide requirement (curated from verified data; matches cost model) ──
const REQUIRED: Record<string, number> = {
  Alabama: 5000, Alaska: 3614, Arizona: 42303, Arkansas: 5000, California: 219403, Colorado: 12000,
  Connecticut: 7500, Delaware: 7600, Florida: 145040, Georgia: 7500, Hawaii: 5223, Idaho: 1000,
  Illinois: 25000, Indiana: 36943, Iowa: 3500, Kansas: 5000, Kentucky: 5000, Louisiana: 5000,
  Maine: 4000, Maryland: 10000, Massachusetts: 10000, Michigan: 44620, Minnesota: 2000, Mississippi: 1000,
  Missouri: 10000, Montana: 5000, Nebraska: 2500, Nevada: 10000, "New Hampshire": 3000, "New Jersey": 2000,
  "New Mexico": 5000, "New York": 45000, "North Carolina": 83874, "North Dakota": 4000, Ohio: 5000,
  Oklahoma: 34599, Oregon: 23744, Pennsylvania: 5000, "Rhode Island": 1000, "South Carolina": 10000,
  "South Dakota": 3502, Tennessee: 275, Texas: 113151, Utah: 1000, Vermont: 1000, Virginia: 5000,
  Washington: 1000, "West Virginia": 7947, Wisconsin: 4000, Wyoming: 3891, "District of Columbia": 4583,
};

// ── deadline parsing (grounded from verified deadlineHeadline) ──
const MO: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
const AS_OF = new Date(2028, 3, 1); // sim "today" = Apr 1 of election year (serious gathering begins)
function daysToDeadline(headline: string): number {
  const m = (headline || "").match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z.]*\s+(\d{1,2})/i);
  if (!m) return 120; // fallback
  const d = new Date(2028, MO[m[1].slice(0, 3).toLowerCase()], +m[2]);
  const days = Math.round((d.getTime() - AS_OF.getTime()) / 86_400_000);
  return days > 0 ? days : 30; // already-passed-in-sim → treat as urgent
}

// ── modeled: yield-per-volunteer-hour priors (RFC-001 §7.4) ──
const OPPS = [
  { name: "event blitz (festival / stadium / transit gate)", rawPerHr: 30, validity: 0.72 },
  { name: "farmers market / campus at peak", rawPerHr: 14, validity: 0.72 },
  { name: "DMV / transit hub / library", rawPerHr: 11, validity: 0.70 },
  { name: "busy retail corridor", rawPerHr: 8, validity: 0.68 },
  { name: "ordinary sidewalk", rawPerHr: 5, validity: 0.64 },
];
const VALIDATION_BOOST = 0.12;        // validation engine lifts validity (capped 0.98)
const DIGITAL_VALIDITY = 0.97;        // where digital capture is legal
const BUFFER = 1.5;                   // collect 1.5× the legal requirement
const validPerHr = (o: { rawPerHr: number; validity: number }, digital = false) =>
  o.rawPerHr * (digital ? DIGITAL_VALIDITY : Math.min(0.98, o.validity + VALIDATION_BOOST));

// ── modeled: the drive's current progress (deterministic sim) ──
// Realistic spread: naive uniform effort so far ⇒ small states ~done, big states behind.
const maxReq = Math.max(...Object.values(REQUIRED));
type S = { st: string; required: number; target: number; collected: number; daysLeft: number };
const states: S[] = master.map((r: any) => {
  const required = REQUIRED[r.jurisdiction] ?? 5000;
  const target = Math.round(required * BUFFER);
  const progress = Math.min(0.95, 0.95 - (required / maxReq) * 0.82); // big states lag
  return { st: r.jurisdiction, required, target, collected: Math.round(target * progress), daysLeft: daysToDeadline(r.deadlineHeadline) };
});

const deficit = (s: S) => Math.max(0, s.target - s.collected);
const requiredRate = (s: S) => deficit(s) / Math.max(s.daysLeft, 1); // valid sigs/day needed = shadow price
const tier = (rr: number) => (rr === 0 ? "✓ done" : rr > 600 ? "🔴 critical" : rr > 150 ? "🟡 behind" : "🟢 on track");
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// ── 1. MARGINAL-VALUE BOARD ──
console.log("\n  1. MARGINAL-VALUE BOARD — where the next volunteer-hour is worth most");
console.log("     (shadow price = valid signatures/day still needed to hit goal×1.5 by deadline)\n");
console.log("     state                req      collected  daysLeft   need/day   tier");
const board = [...states].filter((s) => deficit(s) > 0).sort((a, b) => requiredRate(b) - requiredRate(a));
for (const s of board.slice(0, 12))
  console.log(`     ${s.st.padEnd(20)} ${fmt(s.required).padStart(8)} ${fmt(s.collected).padStart(10)} ${String(s.daysLeft).padStart(8)} ${fmt(requiredRate(s)).padStart(10)}   ${tier(requiredRate(s))}`);
const done = states.filter((s) => deficit(s) === 0).length;
console.log(`     … ${done}/51 jurisdictions already at goal×buffer (zero marginal value — stop gathering there).`);

// ── 2. NEXT-BEST-MOVE (one volunteer) ──
function nextBest(stateName: string, hours: number) {
  const s = states.find((x) => x.st === stateName)!;
  const mv = requiredRate(s);
  const ranked = OPPS.map((o) => {
    const vph = validPerHr(o);
    const expValid = Math.min(deficit(s), vph * hours);
    return { name: o.name, vph, expValid, value: expValid * mv };
  }).sort((a, b) => b.value - a.value);
  const best = ranked[0];
  console.log(`\n  2. NEXT-BEST-MOVE — volunteer in ${stateName}, ${hours} free hours`);
  console.log(`     ${stateName}: ${tier(mv)} · needs ${fmt(mv)} valid/day · ${fmt(deficit(s))} short of goal`);
  console.log(`     → Best spot: ${best.name}`);
  console.log(`       ~${fmt(best.expValid)} valid signatures (${best.vph.toFixed(1)}/hr × ${hours}h) toward ${stateName}`);
  const topNeed = board[0];
  if (mv < requiredRate(topNeed) * 0.5)
    console.log(`     ⚑ ${stateName} is low-priority; if you can travel, the drive most needs ${topNeed.st} (${fmt(requiredRate(topNeed))} valid/day).`);
}
nextBest("California", 3);
nextBest("Vermont", 3);

// ── 3. OPTIMIZER vs NAIVE — same volunteer-hours, different allocation ──
const HOURS_PER_DAY = 700;      // modeled: national volunteer-hours/day — scarce relative to the urgent states
const BLENDED_VPH = 9;          // modeled: blended valid sigs / volunteer-hour
const CPRS = 7;                 // paid cost per required signature to fill any gap (mid)
const SIM_DAYS = 130;

function simulate(strategy: "naive" | "optimizer") {
  const st = states.map((s) => ({ ...s }));
  for (let day = 0; day < SIM_DAYS; day++) {
    const open = st.filter((s) => s.target - s.collected > 0 && s.daysLeft - day > 0);
    if (!open.length) break;
    if (strategy === "naive") {
      const per = HOURS_PER_DAY / open.length;          // spread evenly
      for (const s of open) s.collected = Math.min(s.target, s.collected + per * BLENDED_VPH);
    } else {
      // pour hours into highest shadow-price states, each capped at its on-pace need (LP behavior)
      let budget = HOURS_PER_DAY;
      const ranked = open.sort((a, b) => (Math.max(0, b.target - b.collected) / Math.max(b.daysLeft - day, 1)) - (Math.max(0, a.target - a.collected) / Math.max(a.daysLeft - day, 1)));
      for (const s of ranked) {
        if (budget <= 0) break;
        const needSigs = Math.max(0, s.target - s.collected);
        const onPaceHrs = (needSigs / Math.max(s.daysLeft - day, 1)) / BLENDED_VPH; // hrs to stay on pace today
        const give = Math.min(budget, onPaceHrs);
        s.collected = Math.min(s.target, s.collected + give * BLENDED_VPH);
        budget -= give;
      }
      // any leftover budget → dump into the single hottest state
      if (budget > 0 && ranked[0]) ranked[0].collected = Math.min(ranked[0].target, ranked[0].collected + budget * BLENDED_VPH);
    }
  }
  // at each state's deadline, any remaining deficit must be PAID for
  let paid = 0, paidSigs = 0, shortStates = 0;
  for (const s of st) {
    const gap = Math.max(0, s.target - s.collected);
    if (gap > 0) { shortStates++; paidSigs += gap / BUFFER; paid += (gap / BUFFER) * CPRS; }
  }
  return { paid, paidSigs, shortStates };
}
const naive = simulate("naive");
const opt = simulate("optimizer");
console.log("\n  3. OPTIMIZER vs NAIVE — identical volunteer-hours, different routing");
console.log(`     (${fmt(HOURS_PER_DAY)} volunteer-hrs/day · ${BLENDED_VPH} valid/hr · any unfilled gap at deadline is bought @ $${CPRS}/required-sig)\n`);
console.log("     strategy     paid signatures needed     leftover PAID cost");
console.log(`     naive        ${fmt(naive.paidSigs).padStart(8)} sigs            ${money(naive.paid)}`);
console.log(`     optimizer    ${fmt(opt.paidSigs).padStart(8)} sigs            ${money(opt.paid)}`);
console.log(`\n     → Same volunteers, smarter routing cuts the paid bill from ${money(naive.paid)} to ${money(opt.paid)}`);
console.log(`       (${money(naive.paid - opt.paid)} saved, ~${(100 * (1 - opt.paid / naive.paid)).toFixed(0)}%). The optimizer front-loads the high-deadline-risk`);
console.log(`       states (CA / TX / NC / FL) so volunteers finish them in time; naive spreads thin and`);
console.log(`       leaves the biggest states catastrophically short — where paid signatures are most expensive.\n`);
