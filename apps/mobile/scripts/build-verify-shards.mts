/**
 * build-verify-shards — ZIP-sharded record store for statewide Tier 2 /verify (RFC-002-A1 §5).
 *
 * The membership filter (Tier 1b) answers "registered?" statewide offline, but carries no records, so
 * it can't return a matched voter id (needed for dedup). Tier 2 closes that: the server matches the
 * FULL roll authoritatively. But a Worker can't hold 6.7M records per request — so we BLOCK by ZIP:
 * shard active voters into one small artifact per ZIP. /verify fetches just the signer's ZIP shard
 * (~one R2 object, a few k voters) and runs the real engine matcher on it. Statewide coverage, O(1)
 * fetch per lookup.
 *
 * Spec-driven via the jurisdiction adapter (sources.ts). Output mirrors an index artifact so the
 * Worker reuses buildIndex/validateSigner.
 *
 * Run (from apps/mobile, file in voterfiles/<State>.*):
 *   node --experimental-strip-types scripts/build-verify-shards.mts
 * Output (gitignored): voterfiles/out/verify/<campaign>/zip/<zip5>.json + manifest of shards.
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { ADAPTERS } from "../../../prototypes/validation-engine/sources.ts";
import { splitDelimited, normalizeStatus, normalizeDate, type AdapterSpec, type CanonicalField } from "../../../prototypes/validation-engine/load.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_IN = join(HERE, "..", "voterfiles");
const OUT = join(REAL_IN, "out", "verify");

// Which ZIPs to shard. The DEMO set spans the campaign turf (Charlotte) + an out-of-metro ZIP
// (Raleigh 27614) to prove statewide resolution. Empty array = ALL ZIPs (full statewide; higher
// memory — the operator's heavier run).
interface Job { campaignId: string; jurisdiction: string; zips: string[] }
const JOBS: Job[] = [
  { campaignId: "nc-independent", jurisdiction: "North Carolina", zips: ["28202", "28203", "28204", "28205", "28211", "27614"] },
  // Ohio — campaign turf (OSU/Columbus 43201/43210) + Cleveland 44114 (out-of-metro, proves statewide
  // resolution). Drop voterfiles/ohio.csv (single header — see sources.ts Ohio note).
  { campaignId: "oh-minwage", jurisdiction: "Ohio", zips: ["43201", "43210", "44114"] },
];

function makeGet(headerLine: string, spec: AdapterSpec) {
  const header = splitDelimited(headerLine, spec.delimiter);
  const idx = new Map(header.map((h, i) => [h.trim(), i]));
  const at = (row: string[], ref: string | number): string => {
    const i = typeof ref === "string" ? idx.get(ref) : ref - 1;
    return i == null || i < 0 ? "" : (row[i] ?? "").trim();
  };
  return (row: string[], field: CanonicalField): string => {
    const ref = spec.columns[field];
    if (ref == null) return "";
    return Array.isArray(ref) ? ref.map((r) => at(row, r)).join(" ").trim() : at(row, ref);
  };
}

async function build(job: Job) {
  const spec = ADAPTERS[job.jurisdiction];
  if (!spec) return console.log(`  ${job.campaignId}: no adapter for ${job.jurisdiction} — skipped`);
  const base = job.jurisdiction.replace(/\s+/g, "_").toLowerCase();
  const file = existsSync(REAL_IN) ? readdirSync(REAL_IN).find((f) => f.toLowerCase().startsWith(base + ".") || f.toLowerCase().startsWith(base + "_")) : undefined;
  if (!file) return console.log(`  ${job.campaignId}: no file for ${job.jurisdiction} in voterfiles/ — skipped`);

  const want = new Set(job.zips);
  const shards = new Map<string, Array<{ id: string; name: string; address: string; status: string; registeredOn: string; county: string; district: string }>>();
  let scanned = 0, kept = 0;
  const rl = createInterface({ input: createReadStream(join(REAL_IN, file), { encoding: "latin1" }), crlfDelay: Infinity });
  let get: ReturnType<typeof makeGet> | null = null;
  for await (const raw of rl) {
    const line = raw.replace(/\r$/, "");
    if (!line) continue;
    if (!get) { get = makeGet(line, spec); if (spec.hasHeader) continue; }
    scanned++;
    const r = splitDelimited(line, spec.delimiter);
    const zip5 = get(r, "zip").replace(/[^0-9]/g, "").slice(0, 5);
    if (want.size && !want.has(zip5)) continue;
    if (normalizeStatus(get(r, "status"), spec) !== "active") continue;
    const rec = {
      id: get(r, "voterId"),
      name: [get(r, "firstName"), get(r, "middleName"), get(r, "lastName")].filter(Boolean).join(" "),
      address: `${get(r, "streetAddress")}, ${get(r, "city")} ${get(r, "state")} ${zip5}`.replace(/\s+/g, " ").trim(),
      status: "active",
      registeredOn: normalizeDate(get(r, "registrationDate"), spec.dateFormat),
      county: get(r, "county"), district: get(r, "district"),
    };
    (shards.get(zip5) ?? shards.set(zip5, []).get(zip5)!).push(rec);
    kept++;
  }

  const outDir = join(OUT, job.campaignId, "zip");
  rmSync(join(OUT, job.campaignId), { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const builtAt = new Date().toISOString().slice(0, 10);
  const manifest: Array<{ zip: string; voterCount: number; version: string }> = [];
  for (const [zip, voters] of shards) {
    const version = createHash("sha1").update(JSON.stringify(voters)).digest("hex").slice(0, 12);
    writeFileSync(join(outDir, `${zip}.json`), JSON.stringify({ campaignId: job.campaignId, zip, jurisdiction: job.jurisdiction, builtAt, version, voterCount: voters.length, voters }));
    manifest.push({ zip, voterCount: voters.length, version });
  }
  manifest.sort((a, b) => b.voterCount - a.voterCount);
  writeFileSync(join(OUT, job.campaignId, "shards.json"), JSON.stringify({ campaignId: job.campaignId, builtAt, shardCount: manifest.length, shards: manifest }, null, 2));
  console.log(`  ${job.campaignId} (${job.jurisdiction}): ${scanned.toLocaleString()} scanned → ${kept.toLocaleString()} active in ${manifest.length} ZIP shards`);
  for (const s of manifest) console.log(`    ${s.zip}: ${s.voterCount} voters · v${s.version}`);
}

console.log("\n⚠️  Building ZIP-sharded verify records from lawfully-obtained voter files (real PII, gitignored).\n");
for (const job of JOBS) await build(job);
console.log(`\nVerify shards → ${OUT}/<campaign>/zip/<zip5>.json\n`);
