/**
 * build-indexes — the per-campaign index builder (the loader seam).
 *
 * TWO MODES:
 *
 *   (default, SYNTHETIC)  node --experimental-strip-types scripts/build-indexes.mts
 *     Serializes synthetic voters INTO each state's real on-disk format, runs the real adapter back
 *     over it, scopes to the campaign's zips, and writes the COMMITTED demo artifacts to
 *     src/data/indexes/<id>.json. Zero real PII. This is what ships in the repo/app.
 *
 *   (REAL)                node --experimental-strip-types scripts/build-indexes.mts --real
 *     Reads a LAWFULLY-OBTAINED state voter file you placed in voterfiles/<State>.* (gitignored),
 *     streams it through the SAME adapter scoped to the campaign's zips, and writes minimized
 *     artifacts to voterfiles/out/<id>.json (gitignored). The raw file NEVER enters git; the
 *     minimized artifact is real PII (names+addresses in a few zips) and also stays gitignored —
 *     deploy it to devices over the sync channel (server INDEX_DIR), NOT the app bundle.
 *
 * Either way the loader's rowToRecord only extracts canonical fields — DOB/phone/etc. in the source
 * are never read. Going real is genuinely one flag: the pipeline, scoping, and minimization are
 * identical. ⚠️ REAL mode is the operator's responsibility under VOTER_FILE_LAWFUL_BASIS.md —
 * confirm lawful basis + per-state use terms before running it.
 */
import { writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { ADAPTERS } from "../../../prototypes/validation-engine/sources.ts";
import { serialize, type Person } from "../../../prototypes/validation-engine/samples.ts";
import { collectVoterFile } from "../../../prototypes/validation-engine/load.ts";

const REAL = process.argv.includes("--real");
const HERE = dirname(fileURLToPath(import.meta.url));
const SYNTH_OUT = join(HERE, "..", "src", "data", "indexes"); // committed demo artifacts
const REAL_IN = join(HERE, "..", "voterfiles"); // operator drops lawfully-obtained files here (gitignored)
const REAL_OUT = join(REAL_IN, "out"); // real minimized artifacts (gitignored)
const TMP = join(tmpdir(), "gather-voterfiles");

interface CampaignSpec { campaignId: string; jurisdiction: string; zips: string[]; people: Person[]; realLimit?: number }

const P = (
  voterId: string, first: string, last: string, house: string, street: string,
  city: string, state: string, zip: string, status: Person["status"], regISO: string, county: string,
): Person => ({
  voterId, first: first === "Robert" ? "Robert" : first, middle: first === "Robert" ? "A" : "", last, suffix: "",
  house, street, streetAddress: `${house} ${street}`, unit: last === "Gonzalez" ? "4" : "",
  city, state, zip, status, regISO, county, district: "1",
});

const CAMPAIGNS: CampaignSpec[] = [
  {
    campaignId: "oh-minwage", jurisdiction: "Ohio", zips: ["43201", "43210"],
    people: [
      P("OH-0421", "Robert", "Smith", "42", "Main St", "Columbus", "OH", "43210", "active", "2019-03-01", "Franklin"),
      P("OH-0005", "Maria", "Gonzalez", "5", "Sunset Blvd", "Columbus", "OH", "43210", "active", "2021-11-02", "Franklin"),
      P("OH-0017", "Elizabeth", "Carter", "17", "Elm Lane", "Columbus", "OH", "43210", "active", "2020-01-20", "Franklin"),
      P("OH-0230", "James", "O'Brien", "230", "N High St", "Columbus", "OH", "43201", "inactive", "2017-09-10", "Franklin"),
      P("OH-0311", "Aisha", "Rahman", "311", "W 9th Ave", "Columbus", "OH", "43210", "active", "2022-02-14", "Franklin"),
      P("OH-0077", "David", "Nguyen", "77", "Chittenden Ave", "Columbus", "OH", "43201", "active", "2016-08-30", "Franklin"),
    ],
  },
  {
    campaignId: "ok-sick-leave", jurisdiction: "Oklahoma", zips: ["73102", "73104"],
    people: [
      P("OK-0120", "Robert", "Smith", "120", "Robinson Ave", "Oklahoma City", "OK", "73102", "active", "2018-05-09", "Oklahoma"),
      P("OK-0005", "Maria", "Gonzalez", "5", "Sheridan Ave", "Oklahoma City", "OK", "73102", "active", "2020-10-15", "Oklahoma"),
      P("OK-0017", "Elizabeth", "Carter", "17", "Walnut Ave", "Oklahoma City", "OK", "73104", "active", "2019-06-01", "Oklahoma"),
      P("OK-0230", "James", "O'Brien", "230", "N Broadway Ave", "Oklahoma City", "OK", "73102", "inactive", "2016-02-18", "Oklahoma"),
      P("OK-0044", "Michael", "Begay", "44", "NE 8th St", "Oklahoma City", "OK", "73104", "active", "2021-01-30", "Oklahoma"),
      P("OK-0210", "Linda", "Reyes", "210", "N Walker Ave", "Oklahoma City", "OK", "73102", "active", "2017-04-22", "Oklahoma"),
    ],
  },
  {
    campaignId: "wa-housing", jurisdiction: "Washington", zips: ["98105", "98115"],
    people: [
      P("WA-4500", "Robert", "Smith", "4500", "University Way NE", "Seattle", "WA", "98105", "active", "2018-09-12", "King"),
      P("WA-0005", "Maria", "Gonzalez", "5", "Ravenna Blvd", "Seattle", "WA", "98115", "active", "2021-03-04", "King"),
      P("WA-0017", "Elizabeth", "Carter", "17", "Brooklyn Ave NE", "Seattle", "WA", "98105", "active", "2019-11-20", "King"),
      P("WA-0230", "James", "O'Brien", "230", "NE 45th St", "Seattle", "WA", "98105", "inactive", "2016-07-25", "King"),
      P("WA-0088", "Grace", "Kim", "88", "NE Campus Pkwy", "Seattle", "WA", "98105", "active", "2022-09-01", "King"),
      P("WA-1200", "Daniel", "Foster", "1200", "NE 50th St", "Seattle", "WA", "98115", "active", "2017-02-11", "King"),
    ],
  },
  {
    campaignId: "nc-independent", jurisdiction: "North Carolina", zips: ["28202", "28203", "28204", "28205"], realLimit: 8000,
    people: [
      P("NC-0100", "Robert", "Smith", "100", "N Tryon St", "Charlotte", "NC", "28202", "active", "2018-04-10", "Mecklenburg"),
      P("NC-0005", "Maria", "Gonzalez", "5", "W Trade St", "Charlotte", "NC", "28202", "active", "2020-09-12", "Mecklenburg"),
      P("NC-0017", "Elizabeth", "Carter", "17", "S College St", "Charlotte", "NC", "28202", "active", "2019-05-20", "Mecklenburg"),
      P("NC-0230", "James", "O'Brien", "230", "E 7th St", "Charlotte", "NC", "28204", "inactive", "2016-03-15", "Mecklenburg"),
      P("NC-0311", "Aisha", "Rahman", "311", "W 9th St", "Charlotte", "NC", "28202", "active", "2021-11-01", "Mecklenburg"),
      P("NC-0077", "David", "Nguyen", "77", "Brevard St", "Charlotte", "NC", "28204", "active", "2017-08-30", "Mecklenburg"),
    ],
  },
];

const ext = (delim: string) => (delim === "\t" ? "tsv" : delim === "|" ? "psv" : "csv");

// Scope by the ZIP field (the trailing zip in the composed address), not a substring — otherwise a
// 5-digit street number would false-match the campaign's zips.
const inZips = (address: string, zips: string[]) => {
  const z = (address.match(/\b(\d{5})\b\s*$/) || [])[1];
  return !!z && zips.includes(z);
};

/** Find a real voter file the operator placed in voterfiles/ for this jurisdiction (any extension). */
function findRealFile(jurisdiction: string): string | null {
  if (!existsSync(REAL_IN)) return null;
  const base = jurisdiction.replace(/\s+/g, "_").toLowerCase();
  const hit = readdirSync(REAL_IN).find((f) => {
    const name = f.toLowerCase();
    return name.startsWith(base + ".") || name.startsWith(base + "_");
  });
  return hit ? join(REAL_IN, hit) : null;
}

async function votersForSynthetic(c: CampaignSpec) {
  const spec = ADAPTERS[c.jurisdiction];
  const samplePath = join(TMP, `${c.campaignId}.${ext(spec.delimiter)}`);
  writeFileSync(samplePath, serialize(spec, c.people));
  return collectVoterFile(samplePath, spec, { filter: (r) => inZips(r.address, c.zips) });
}

async function votersForReal(c: CampaignSpec) {
  const spec = ADAPTERS[c.jurisdiction];
  const path = findRealFile(c.jurisdiction);
  if (!path) return null; // operator only dropped some states' files → skip the rest
  // Streams the (possibly large) real file, scoped to the campaign's zips → bounded memory + minimized;
  // realLimit caps the scoped set so a dense metro doesn't produce an enormous index.
  return collectVoterFile(path, spec, { filter: (r) => inZips(r.address, c.zips), limit: c.realLimit });
}

async function main() {
  const outDir = REAL ? REAL_OUT : SYNTH_OUT;
  mkdirSync(outDir, { recursive: true });
  mkdirSync(TMP, { recursive: true });
  if (REAL) {
    console.log("\n⚠️  REAL mode — reading lawfully-obtained voter files from voterfiles/.");
    console.log("    Output is real PII (gitignored). Confirm lawful basis per VOTER_FILE_LAWFUL_BASIS.md.\n");
  }
  const builtAt = new Date().toISOString().slice(0, 10);
  const summary: string[] = [];

  for (const c of CAMPAIGNS) {
    const spec = ADAPTERS[c.jurisdiction];
    if (!spec) throw new Error(`no adapter for ${c.jurisdiction}`);
    const voters = REAL ? await votersForReal(c) : await votersForSynthetic(c);
    if (REAL && !voters) { summary.push(`  ${c.campaignId}: no file for ${c.jurisdiction} in voterfiles/ — skipped`); continue; }
    // Content version — any change to the voters yields a new hash; the device's delta sync diffs against it.
    const version = createHash("sha1").update(JSON.stringify(voters)).digest("hex").slice(0, 12);
    const artifact = {
      _generated: `build-indexes.mts${REAL ? " --real (PII — DO NOT COMMIT)" : " (synthetic demo)"}`,
      campaignId: c.campaignId, jurisdiction: c.jurisdiction, scopedZips: c.zips, builtAt, version,
      real: REAL,
      source: { adapter: spec.jurisdiction, format: ext(spec.delimiter), layoutDocUrl: spec.layoutDocUrl, downloadUrl: spec.downloadUrl, verifiedAsOf: spec.verifiedAsOf, confidence: spec.confidence },
      voterCount: voters.length, voters,
    };
    writeFileSync(join(outDir, `${c.campaignId}.json`), JSON.stringify(artifact, null, 2) + "\n");
    summary.push(`  ${c.campaignId} (${c.jurisdiction}, .${ext(spec.delimiter)}) → ${voters.length} voters in ${c.zips.join("/")}`);
  }

  console.log(`built ${CAMPAIGNS.length} ${REAL ? "REAL" : "synthetic"} indexes → ${outDir}`);
  console.log(summary.join("\n") + "\n");
  if (REAL) console.log("Serve them:  INDEX_DIR=apps/mobile/voterfiles/out node apps/mobile/server/sync-server.mjs\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
