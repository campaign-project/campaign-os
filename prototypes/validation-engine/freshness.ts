/**
 * Freshness report — turns `verifiedAsOf` into an action, not a decoration.
 *
 * Ballot-access data drifts: fees change by statute (AL HB67 cut its statewide fee
 * ~$38k→$1k effective 2026-06-01), request processes change, and file layouts get
 * revised (FL's layout rev 2026-05-04). Each verified record carries the date WE last
 * confirmed it; this tool flags records past a re-check window so a stale snapshot
 * can't masquerade as current truth.
 *
 * Two cadences (acquisition data moves faster than file layouts):
 *   • voter-file acquisition (fees / access / process): re-check every 180 days
 *   • adapter layouts (columns / delimiter / codes):     re-check every 365 days
 * Low-confidence specs are flagged regardless of date (e.g. MS's unconfirmed columns).
 *
 * Run: node --experimental-strip-types freshness.ts [--today=YYYY-MM-DD] [--voterDays=180] [--layoutDays=365]
 * Exits 1 if anything is past due (CI-friendly), else 0.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ADAPTERS } from "./sources.ts";

const arg = (k: string, d: string): string => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};

const TODAY = arg("today", new Date().toISOString().slice(0, 10));
const VOTER_DAYS = parseInt(arg("voterDays", "180"), 10);
const LAYOUT_DAYS = parseInt(arg("layoutDays", "365"), 10);
const SOON = 30; // flag "due soon" within this many days of the deadline

const addDays = (iso: string, days: number): string => {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
const daysUntil = (iso: string): number => Math.round((Date.parse(iso + "T00:00:00Z") - Date.parse(TODAY + "T00:00:00Z")) / 86400000);

type Status = "fresh" | "soon" | "stale" | "unknown";
interface Row { label: string; verifiedAsOf?: string; due?: string; daysLeft?: number; status: Status; flag?: string; }

function assess(verifiedAsOf: string | undefined, windowDays: number, label: string, flag?: string): Row {
  if (!verifiedAsOf) return { label, status: "unknown", flag: "no verifiedAsOf date" };
  const due = addDays(verifiedAsOf, windowDays);
  const daysLeft = daysUntil(due);
  const status: Status = daysLeft < 0 ? "stale" : daysLeft <= SOON ? "soon" : "fresh";
  return { label, verifiedAsOf, due, daysLeft, status, flag };
}

// ── voter-file acquisition records (from the verified master) ──
const here = dirname(fileURLToPath(import.meta.url));
const master = JSON.parse(readFileSync(join(here, "../../ballot-access-data/verified-rules.master.json"), "utf8")) as any[];
const voterRows = master
  .filter((r) => r.voterFile)
  .map((r) => assess(r.voterFile.verifiedAsOf, VOTER_DAYS, r.jurisdiction));

// ── adapter specs ──
const adapterRows = Object.values(ADAPTERS).map((s) =>
  assess(s.verifiedAsOf, LAYOUT_DAYS, s.jurisdiction, s.confidence === "low" ? "low-confidence spec — re-verify columns" : undefined),
);

function summarize(name: string, rows: Row[], windowDays: number) {
  const c = { fresh: 0, soon: 0, stale: 0, unknown: 0 } as Record<Status, number>;
  for (const r of rows) c[r.status]++;
  const dated = rows.filter((r) => r.due).sort((a, b) => a.daysLeft! - b.daysLeft!);
  const soonest = dated[0];
  console.log(`\n  ${name} — re-check every ${windowDays}d`);
  console.log(`    ${rows.length} records · 🟢 ${c.fresh} fresh · 🟡 ${c.soon} due soon · 🔴 ${c.stale} stale · ⚪ ${c.unknown} undated`);
  if (soonest) {
    const tied = dated.filter((r) => r.due === soonest.due).length;
    const who = tied > 1 ? `${tied} records (all stamped the same day)` : soonest.label;
    console.log(`    next due: ${who} on ${soonest.due} (${soonest.daysLeft}d)`);
  }
  for (const r of rows) {
    if (r.status === "stale" || r.status === "soon" || r.status === "unknown" || r.flag) {
      const icon = { stale: "🔴", soon: "🟡", unknown: "⚪", fresh: "🟢" }[r.status];
      console.log(`    ${icon} ${r.label}${r.due ? ` — due ${r.due} (${r.daysLeft}d)` : ""}${r.flag ? ` · ⚠ ${r.flag}` : ""}`);
    }
  }
  return c.stale;
}

console.log("\n══════════════════════════════════════════════════════════════════");
console.log(`  Data freshness report — as of ${TODAY}`);
console.log("══════════════════════════════════════════════════════════════════");
const staleA = summarize("Voter-file acquisition", voterRows, VOTER_DAYS);
const staleB = summarize("Adapter layouts", adapterRows, LAYOUT_DAYS);

const totalStale = staleA + staleB;
console.log(`\n  ${totalStale === 0 ? "All verified records are within their re-check window." : `${totalStale} record(s) past due — re-verify before relying on them.`}\n`);
process.exit(totalStale > 0 ? 1 : 0);
