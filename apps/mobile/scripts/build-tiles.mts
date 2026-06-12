/**
 * build-tiles — the turf-tiling index builder (RFC-002-A1 §3).
 *
 * Buckets a lawfully-obtained statewide voter file into small, turf-sized TILES and emits one
 * minimized artifact per tile (+ a manifest), so a device downloads only the tiles its assignment
 * covers (~1 MB) instead of a metro/state. The device never holds the statewide file.
 *
 * SPEC-DRIVEN, never per-state: the tile CELL and every column come from the jurisdiction's
 * AdapterSpec (sources.ts). A state that exposes a compact sub-county geography maps it to the
 * `tileCell` canonical field (NC → precinct); states that don't fall back to ZIP+street-segment.
 * (Geocode→H3 is the future third option — see RFC-002-A1 §3/§9.) Adding a state = a spec, not code.
 *
 * Each tile record carries PRECOMPUTED search tokens (§3) so the device builds its autocomplete
 * corpus with zero on-device normalization.
 *
 * Run (from apps/mobile, file dropped in voterfiles/<State>.*):
 *   node --experimental-strip-types scripts/build-tiles.mts
 * Output (gitignored): voterfiles/out/tiles/<campaign>/<cell>.json + manifest.json
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { ADAPTERS } from "../../../prototypes/validation-engine/sources.ts";
import { splitDelimited, normalizeStatus, normalizeDate, type AdapterSpec, type CanonicalField } from "../../../prototypes/validation-engine/load.ts";
import { normName, normAddress, basic } from "../../../prototypes/validation-engine/normalize.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const REAL_IN = join(HERE, "..", "voterfiles");          // operator drops lawfully-obtained files here (gitignored)
const TILES_OUT = join(REAL_IN, "out", "tiles");          // tile artifacts (gitignored)
const MAX_TILE = 4000;                                    // split a denser cell into house-number bands

// What to tile: a campaign + the coverage ZIPs that scope it. The tiling CELL is NOT here — it
// comes from the jurisdiction's adapter, so this stays a thin per-campaign config. `probeId` is an
// optional known voter id — the build prints which tile it landed in (a demo sanity check), no
// effect on output. After the first real build, read manifest.json and paste the covering cell(s)
// into the campaign's `turf` (apps/mobile/src/data/campaigns.ts) — the NC entry shows the pattern.
interface TileJob { campaignId: string; jurisdiction: string; zips: string[]; probeId?: string }
const JOBS: TileJob[] = [
  { campaignId: "nc-independent", jurisdiction: "North Carolina", zips: ["28202", "28203", "28204", "28205", "28211"], probeId: "CW287640" },
  // Ohio Minimum Wage — OSU campus district (Franklin County). Drop voterfiles/ohio.csv (per-county
  // CSVs concatenated to ONE file with a single header — see sources.ts Ohio note); tiles by precinct.
  { campaignId: "oh-minwage", jurisdiction: "Ohio", zips: ["43201", "43210"] },
];

interface Rec {
  id: string; name: string; address: string; status: string; registeredOn: string;
  county: string; district: string; t: string[]; h: string; // t = search tokens, h = house number (§3)
}

const slug = (s: string) => basic(s).replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") || "na";

/** A row reader bound to this file's header + the jurisdiction's spec. Handles header-name or
 *  positional refs and array-concat refs, exactly like the loader's column resolution. */
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

/** The tile cell for a voter. Scheme is decided ONCE per state (does the adapter map `tileCell`?),
 *  not per row: under the tileCell scheme, a county-qualified precinct (codes repeat across
 *  counties); rows missing a cell collapse into one `<county>__nocell` catch-all rather than
 *  fragmenting. The ZIP+street fallback is for states with no tile cell at all. */
function cellOf(useCell: boolean, get: ReturnType<typeof makeGet>, row: string[], county: string, zip5: string, street: string): string {
  if (useCell) { const tc = get(row, "tileCell"); return `${slug(county || "x")}__${tc ? slug(tc) : "nocell"}`; }
  return `${zip5 || "00000"}__${slug(street) || "na"}`;
}

async function tile(job: TileJob) {
  const spec = ADAPTERS[job.jurisdiction];
  if (!spec) return console.log(`  ${job.campaignId}: no adapter for ${job.jurisdiction} — skipped`);
  const base = job.jurisdiction.replace(/\s+/g, "_").toLowerCase();
  const file = existsSync(REAL_IN) ? readdirSync(REAL_IN).find((f) => f.toLowerCase().startsWith(base + ".") || f.toLowerCase().startsWith(base + "_")) : undefined;
  if (!file) return console.log(`  ${job.campaignId}: no file for ${job.jurisdiction} in voterfiles/ — skipped`);

  const zips = new Set(job.zips);
  const tiles = new Map<string, Rec[]>();
  const useCell = spec.columns.tileCell != null;        // per-state decision, not per-row
  const scheme = useCell ? "tileCell" : "zip-street";
  let scanned = 0, kept = 0;
  let probeCell = "";

  const rl = createInterface({ input: createReadStream(join(REAL_IN, file), { encoding: "latin1" }), crlfDelay: Infinity });
  let get: ReturnType<typeof makeGet> | null = null;
  for await (const raw of rl) {
    const line = raw.replace(/\r$/, "");
    if (!line) continue;
    if (!get) { get = spec.hasHeader ? makeGet(line, spec) : makeGet("", spec); if (spec.hasHeader) continue; }
    scanned++;
    const row = splitDelimited(line, spec.delimiter);

    const zip5 = get(row, "zip").replace(/[^0-9]/g, "").slice(0, 5);
    if (zips.size && !zips.has(zip5)) continue;

    const name = [get(row, "firstName"), get(row, "middleName"), get(row, "lastName")].filter(Boolean).join(" ");
    const address = `${get(row, "streetAddress")}, ${get(row, "city")} ${get(row, "state")} ${zip5}`.replace(/\s+/g, " ").trim();
    const na = normAddress(address);
    const nn = normName(name);
    const rec: Rec = {
      id: get(row, "voterId"),
      name, address,
      status: normalizeStatus(get(row, "status"), spec),
      registeredOn: normalizeDate(get(row, "registrationDate"), spec.dateFormat),
      county: get(row, "county"),
      district: get(row, "district"),
      t: [nn.first, nn.middle, nn.last, ...na.street.split(" "), na.zip5].filter(Boolean),
      h: na.number,
    };

    const key = cellOf(useCell, get, row, rec.county, zip5, na.street);
    (tiles.get(key) ?? tiles.set(key, []).get(key)!).push(rec);
    kept++;
    if (job.probeId && rec.id === job.probeId) probeCell = key;
  }

  // Split any oversize cell (dense precinct) into house-number bands so no tile blows the budget.
  const final = new Map<string, Rec[]>();
  for (const [key, recs] of tiles) {
    if (recs.length <= MAX_TILE) { final.set(key, recs); continue; }
    recs.sort((a, b) => (Number(a.h) || 0) - (Number(b.h) || 0) || a.name.localeCompare(b.name));
    for (let i = 0, b = 0; i < recs.length; i += MAX_TILE, b++) final.set(`${key}__b${b}`, recs.slice(i, i + MAX_TILE));
  }

  const outDir = join(TILES_OUT, job.campaignId);
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  const builtAt = new Date().toISOString().slice(0, 10);
  const cells: Array<{ cell: string; voterCount: number; version: string; file: string; zip: string }> = [];
  for (const [cell, recs] of final) {
    const version = createHash("sha1").update(JSON.stringify(recs)).digest("hex").slice(0, 12);
    const fname = `${cell}.json`;
    writeFileSync(join(outDir, fname), JSON.stringify({ campaignId: job.campaignId, cell, jurisdiction: job.jurisdiction, builtAt, version, voterCount: recs.length, voters: recs }));
    // Modal residential ZIP for this cell (a precinct sits ≈ within one ZIP) — lets the optimizer
    // join the per-ZIP yield store to a per-turf yield prior.
    const zc = new Map<string, number>();
    for (const r of recs) { const z = r.address.match(/(\d{5})\s*$/)?.[1]; if (z) zc.set(z, (zc.get(z) ?? 0) + 1); }
    const zip = [...zc.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    cells.push({ cell, voterCount: recs.length, version, file: fname, zip });
  }
  cells.sort((a, b) => b.voterCount - a.voterCount);
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify({
    campaignId: job.campaignId, jurisdiction: job.jurisdiction, tileScheme: scheme, builtAt,
    tileCount: cells.length, voterTotal: kept, cells,
  }, null, 2));

  const sizes = cells.map((c) => c.voterCount).sort((a, b) => a - b);
  const med = sizes[Math.floor(sizes.length / 2)] ?? 0;
  console.log(`  ${job.campaignId} (${job.jurisdiction}, scheme=${scheme}): ${scanned.toLocaleString()} scanned → ${kept.toLocaleString()} in scope → ${cells.length} tiles`);
  console.log(`    tile records  min ${sizes[0] ?? 0} · median ${med} · max ${sizes[sizes.length - 1] ?? 0}`);
  if (job.probeId) console.log(`    probe ${job.probeId} → tile ${probeCell || "(out of scope)"}`);
}

console.log("\n⚠️  Tiling lawfully-obtained voter files from voterfiles/. Output is real PII (gitignored).\n");
mkdirSync(TILES_OUT, { recursive: true });
for (const job of JOBS) await tile(job);
console.log(`\nTiles → ${TILES_OUT}/<campaign>/  (per-tile artifacts + manifest.json)\n`);
