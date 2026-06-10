/**
 * BallotAccessDB build — compile the verified knowledge graph into the published
 * OPEN dataset: canonical records validated against the JSON Schema, plus a manifest.
 *
 * Source of truth is ../ballot-access-data/verified-rules.master.json (the internal
 * working graph). This emits the clean, licensed, schema-conformant PUBLIC artifact —
 * dropping internal-only fields and surfacing provenance (citations, verifiedAsOf,
 * gate). The proprietary validity-intelligence (Moat B) is deliberately NOT here:
 * BallotAccessDB is the open commons; the yield data is the moat.
 *
 * Run: node --experimental-strip-types build.ts
 * Exits non-zero if any record fails schema validation (the schema is load-bearing).
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const master = JSON.parse(readFileSync(join(HERE, "../ballot-access-data/verified-rules.master.json"), "utf8"));
const schema = JSON.parse(readFileSync(join(HERE, "schema/ballot-access-rule.schema.json"), "utf8"));

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
const ABBR: Record<string, string> = { Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD", Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT", Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY", "District of Columbia": "DC" };

const GATE_RANK: Record<string, number> = { "AUTO-LIVE": 0, "CONSERVATIVE-HOLD": 1, "BLOCKED": 2 };
const strictest = (gates: string[]) => gates.filter(Boolean).sort((a, b) => (GATE_RANK[b] ?? 0) - (GATE_RANK[a] ?? 0))[0] ?? "AUTO-LIVE";
const pick = (o: any, keys: string[]) => { const r: any = {}; for (const k of keys) if (o && o[k] !== undefined && o[k] !== null) r[k] = o[k]; return r; };

// ── minimal, dependency-free JSON Schema validator (required / type / const / enum / pattern / range / properties / items / additionalProperties:false) ──
function validate(v: any, s: any, path = "$"): string[] {
  const errs: string[] = [];
  const typeOf = (x: any) => (Array.isArray(x) ? "array" : x === null ? "null" : typeof x);
  if (s.const !== undefined && v !== s.const) errs.push(`${path}: expected const ${JSON.stringify(s.const)}`);
  if (s.enum && !s.enum.includes(v)) errs.push(`${path}: ${JSON.stringify(v)} not in enum`);
  if (s.type) {
    const t = typeOf(v);
    const ok = s.type === "integer" ? (t === "number" && Number.isInteger(v)) : t === s.type;
    if (!ok) { errs.push(`${path}: expected ${s.type}, got ${t}`); return errs; }
  }
  if (typeof v === "number") { if (s.minimum !== undefined && v < s.minimum) errs.push(`${path}: < minimum`); if (s.maximum !== undefined && v > s.maximum) errs.push(`${path}: > maximum`); }
  if (typeof v === "string" && s.pattern && !new RegExp(s.pattern).test(v)) errs.push(`${path}: fails pattern ${s.pattern}`);
  if (s.type === "object" && v && typeof v === "object") {
    for (const req of s.required ?? []) if (!(req in v)) errs.push(`${path}.${req}: required`);
    if (s.additionalProperties === false) for (const k of Object.keys(v)) if (!(s.properties && k in s.properties)) errs.push(`${path}.${k}: additional property not allowed`);
    for (const [k, sub] of Object.entries(s.properties ?? {})) if (v[k] !== undefined) errs.push(...validate(v[k], sub, `${path}.${k}`));
  }
  if (s.type === "array" && Array.isArray(v) && s.items) v.forEach((it, i) => errs.push(...validate(it, s.items, `${path}[${i}]`)));
  return errs;
}

function toCanonical(r: any): any {
  const fields = r.fields ?? [];
  const cites: any[] = [];
  for (const f of fields) for (const c of f.citations ?? []) cites.push(pick({ field: f.field, ...c }, ["field", "url", "quote"]));
  for (const c of r.compensationModel?.citations ?? []) cites.push(pick({ field: "compensation", ...c }, ["field", "url", "quote"]));
  for (const c of r.voterFile?.citations ?? []) cites.push(pick({ field: "voterFile", ...c }, ["field", "url", "quote"]));
  for (const c of r.circulator?.citations ?? []) cites.push(pick({ field: c.field || "circulator", url: c.url, quote: c.quote }, ["field", "url", "quote"]));

  const rules = fields.map((f: any) => pick({ field: f.field, gate: f.gate, value: f.reliedValue, confidence: f.confidence, interpretationRequired: f.interpretationRequired, note: f.note }, ["field", "gate", "value", "confidence", "interpretationRequired", "note"]));
  const gate = strictest(fields.map((f: any) => f.gate).concat(r.compensationModel?.gate));

  const rec: any = {
    schemaVersion: "1.1.0",
    id: ABBR[r.jurisdiction] ?? "??",
    jurisdiction: r.jurisdiction,
    abbr: ABBR[r.jurisdiction] ?? "??",
    petitionType: "independent-presidential",
    signatures: pick({ required: REQUIRED[r.jurisdiction] ?? 5000, headline: r.signaturesHeadline }, ["required", "headline"]),
    deadline: pick({ headline: r.deadlineHeadline }, ["headline"]),
    rules,
    compensation: pick(r.compensationModel ?? {}, ["perSignatureAllowed", "paidCirculatorsAllowed", "payMethod", "circulatorResidency", "operatingStance", "gate"]),
    voterFile: pick(r.voterFile ?? {}, ["tier", "cost", "whoCanObtain", "useRestrictions", "requestProcess", "hasNeededFields", "downloadUrl", "layoutDocUrl", "verifiedAsOf"]),
    circulator: pick(r.circulator ?? {}, ["minAge", "ageRule", "minorCanCirculate", "registeredVoterRequired", "usCitizenRequired", "stateResidentRequired", "signerVsCirculator", "gate", "note", "verifiedAsOf"]),
    verification: pick({ gate, sosInquiries: (r.sosInquiries ?? []).length, riskNote: r.riskNote }, ["gate", "sosInquiries", "riskNote"]),
    citations: cites,
    provenance: { verifiedAsOf: r.voterFile?.verifiedAsOf ?? "2026-06-07", method: "multi-agent research → deterministic citation-grounding → adversarial verify → conservative gate (no human counsel)", source: "CampaignOS verified-rules.master.json" },
  };
  return rec;
}

const records = master.map(toCanonical);

// ── v1.1: ballot-INITIATIVE records from the initiative-rules sweep (initiative-rules.seed.json) —
// one record per measure type per state (initiated-constitutional-amendment / initiated-statute /
// veto-referendum / popular-referendum), primary-source-grounded + conservative-gated. Regenerate
// the seed from the sweep output with /tmp/gen-initiative-seed.mjs.
const seedPath = join(HERE, "initiative-rules.seed.json");
if (existsSync(seedPath)) for (const rec of JSON.parse(readFileSync(seedPath, "utf8"))) records.push(rec);
records.sort((a: any, b: any) => a.jurisdiction.localeCompare(b.jurisdiction) || a.id.localeCompare(b.id));

// validate every record — the schema is load-bearing
let errCount = 0;
for (const rec of records) { const e = validate(rec, schema); if (e.length) { errCount += e.length; console.log(`✗ ${rec.jurisdiction}:`); for (const m of e.slice(0, 6)) console.log(`    ${m}`); } }

// write the published dataset
const dataDir = join(HERE, "data"), byDir = join(dataDir, "by-jurisdiction");
mkdirSync(byDir, { recursive: true });
writeFileSync(join(dataDir, "ballot-access-rules.json"), JSON.stringify(records, null, 1));
for (const rec of records) writeFileSync(join(byDir, `${rec.id}.json`), JSON.stringify(rec, null, 1));

const tally = (fn: (r: any) => string) => records.reduce((a: any, r: any) => { const k = fn(r); a[k] = (a[k] || 0) + 1; return a; }, {});
const manifest = {
  name: "BallotAccessDB",
  version: "1.1.0",
  schemaVersion: "1.1.0",
  schema: "schema/ballot-access-rule.schema.json",
  petitionTypes: [...new Set(records.map((r: any) => r.petitionType))],
  jurisdictions: new Set(records.map((r: any) => r.abbr)).size,
  records: records.length,
  generatedAt: new Date().toISOString().slice(0, 10),
  license: "ODbL-1.0",
  attribution: "BallotAccessDB / CampaignOS",
  source: "Verified per-jurisdiction research, primary-source-grounded; see each record's citations + provenance.",
  coverage: {
    petitionType: tally((r) => r.petitionType),
    verificationGate: tally((r) => r.verification.gate),
    voterFileTier: tally((r) => r.voterFile.tier ?? "UNKNOWN"),
    perSignature: tally((r) => r.compensation.perSignatureAllowed ?? "unknown"),
    totalCitations: records.reduce((a: number, r: any) => a + r.citations.length, 0),
    openSosInquiries: records.reduce((a: number, r: any) => a + (r.verification.sosInquiries || 0), 0),
  },
};
writeFileSync(join(dataDir, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log(`\nBallotAccessDB build — ${records.length} records across ${new Set(records.map((r: any) => r.abbr)).size} jurisdictions · ${manifest.petitionTypes.length} petition type(s)`);
console.log(`  gate:        ${JSON.stringify(manifest.coverage.verificationGate)}`);
console.log(`  voter-file:  ${JSON.stringify(manifest.coverage.voterFileTier)}`);
console.log(`  per-sig:     ${JSON.stringify(manifest.coverage.perSignature)}`);
console.log(`  citations:   ${manifest.coverage.totalCitations} · open SoS inquiries: ${manifest.coverage.openSosInquiries}`);
console.log(`  wrote data/ballot-access-rules.json + ${records.length} per-jurisdiction files + manifest.json`);
console.log(errCount === 0 ? "  ✓ all records valid against ballot-access-rule.schema.json" : `  ✗ ${errCount} schema errors`);
process.exit(errCount === 0 ? 0 : 1);
