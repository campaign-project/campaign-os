/**
 * build-membership — the campaign membership filter (RFC-002-A1 Tier 1b, "the ballpark case").
 *
 * Streams a lawfully-obtained statewide voter file and folds every ACTIVE registration into a Bloom
 * filter over the campaign's ENTIRE eligible set (statewide for a statewide petition). The output is
 * ~10 MB of hashed bits — not records — so a venue device can confirm "is this a registered voter?"
 * OFFLINE for a geographically-dispersed crowd, without holding the ~1.5 GB file. Spec-driven via the
 * jurisdiction's adapter (sources.ts); the Bloom logic is shared with the device (engine.membership).
 *
 * Run (from apps/mobile, file in voterfiles/<State>.*):
 *   node --experimental-strip-types scripts/build-membership.mts
 * Output (gitignored): voterfiles/out/membership/<campaign>.json
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { ADAPTERS } from "../../../prototypes/validation-engine/sources.ts";
import { splitDelimited, normalizeStatus, type AdapterSpec, type CanonicalField } from "../../../prototypes/validation-engine/load.ts";
import { newFilter, addMember, sealFilter, loadFilter, isMember } from "../../../prototypes/validation-engine/membership.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_IN = join(HERE, "..", "voterfiles");
const OUT = join(REAL_IN, "out", "membership");
const FPR = 0.01;           // target false-positive rate
const N_EST = 8_000_000;    // size for ~8M (NC active ≈ 7M → actual FPR a touch better than target)

interface Job { campaignId: string; jurisdiction: string } // statewide eligible set (whole active file)
const JOBS: Job[] = [{ campaignId: "nc-independent", jurisdiction: "North Carolina" }];

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

  const f = newFilter(N_EST, FPR);
  let scanned = 0, active = 0;
  let kirk: { name: string; address: string } | null = null;
  const rl = createInterface({ input: createReadStream(join(REAL_IN, file), { encoding: "latin1" }), crlfDelay: Infinity });
  let get: ReturnType<typeof makeGet> | null = null;
  for await (const raw of rl) {
    const line = raw.replace(/\r$/, "");
    if (!line) continue;
    if (!get) { get = makeGet(line, spec); if (spec.hasHeader) continue; }
    scanned++;
    const r = splitDelimited(line, spec.delimiter);
    if (normalizeStatus(get(r, "status"), spec) !== "active") continue;
    const name = [get(r, "firstName"), get(r, "middleName"), get(r, "lastName")].filter(Boolean).join(" ");
    const z5 = get(r, "zip").replace(/[^0-9]/g, "").slice(0, 5);
    const address = `${get(r, "streetAddress")}, ${get(r, "city")} ${get(r, "state")} ${z5}`.replace(/\s+/g, " ").trim();
    addMember(f, name, address);
    active++;
    if (get(r, "voterId") === "CW287640") kirk = { name, address };
  }

  const filter = sealFilter(f, active, FPR);
  const version = createHash("sha1").update(filter.bits).digest("hex").slice(0, 12);
  mkdirSync(OUT, { recursive: true });
  const builtAt = new Date().toISOString().slice(0, 10);
  writeFileSync(join(OUT, `${job.campaignId}.json`), JSON.stringify({ campaignId: job.campaignId, jurisdiction: job.jurisdiction, builtAt, version, ...filter }));

  // Self-check: a real member hits; random fakes estimate the realized false-positive rate.
  const loaded = loadFilter(filter);
  const kirkHit = kirk ? isMember(loaded, kirk.name, kirk.address) : false;
  const kirkCasual = isMember(loaded, "Kirk Fanelly", "130 Sharon Township Ln, Charlotte NC 28211");
  let fp = 0; const TRIALS = 20000;
  for (let i = 0; i < TRIALS; i++) if (isMember(loaded, `Zzqx${i} Nonexistent`, `${i} Imaginary Rd, Nowhere NC 00000`)) fp++;
  const sizeMB = (filter.bits.length / 1024 / 1024).toFixed(1);

  console.log(`  ${job.campaignId} (${job.jurisdiction}): ${scanned.toLocaleString()} scanned · ${active.toLocaleString()} active members`);
  console.log(`    filter  m=${f.m.toLocaleString()} bits · k=${f.k} · ~${(f.m / 8 / 1024 / 1024).toFixed(1)}MB raw · ${sizeMB}MB base64 · version ${version}`);
  console.log(`    Kirk (full)=${kirkHit}  Kirk (casual, no middle)=${kirkCasual}  measured FPR=${(fp / TRIALS * 100).toFixed(2)}% (target ${FPR * 100}%)`);
}

console.log("\n⚠️  Building membership filter from lawfully-obtained voter files (hashed bits, not records; output gitignored).\n");
for (const job of JOBS) await build(job);
console.log(`\nFilter → ${OUT}/<campaign>.json\n`);
