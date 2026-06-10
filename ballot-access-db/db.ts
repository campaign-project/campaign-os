/**
 * BallotAccessDB — query API over the published open dataset.
 *
 * Pure query library (no network, no deps). `handle()` is a request router that maps an
 * HTTP-style (method, path, params) to these functions, so a server is a ~10-line wrapper:
 *   app.get("/v1/*", (req,res) => res.json(handle("GET", req.path, req.query).body))
 * The documented endpoints are in ENDPOINTS.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
let _rules: any[] | null = null;
let _manifest: any = null;
let _schema: any = null;

export function loadDB(): any[] {
  if (!_rules) _rules = JSON.parse(readFileSync(join(HERE, "data/ballot-access-rules.json"), "utf8"));
  return _rules!;
}
export function manifest(): any {
  if (!_manifest) _manifest = JSON.parse(readFileSync(join(HERE, "data/manifest.json"), "utf8"));
  return _manifest;
}
export function schema(): any {
  if (!_schema) _schema = JSON.parse(readFileSync(join(HERE, "schema/ballot-access-rule.schema.json"), "utf8"));
  return _schema;
}

/** One record by record id (e.g. "MI-ICA"), 2-letter abbr, or full jurisdiction name
 *  (case-insensitive). When an abbr/name has multiple petition types, the
 *  independent-presidential record sorts first and is returned by the bare abbr/name. */
export function get(id: string): any | undefined {
  const k = (id || "").trim().toLowerCase();
  return loadDB().find((r) => (r.id ?? "").toLowerCase() === k || r.abbr.toLowerCase() === k || r.jurisdiction.toLowerCase() === k);
}

export interface Query {
  petitionType?: string; // independent-presidential | initiated-constitutional-amendment | ...
  perSignature?: "go" | "yes" | "no" | "unaddressed"; // "go" = yes OR unaddressed (the aggressive ladder)
  voterFileTier?: string;
  freeVoterFile?: boolean; // FREE_DOWNLOAD only
  gate?: string;
  maxSignatures?: number;
  minSignatures?: number;
  residencyRequired?: boolean;
  q?: string; // name/abbr substring
}

const truthy = (v: any) => v === true || v === "true" || v === "1";

export function query(f: Query = {}): any[] {
  return loadDB().filter((r) => {
    if (f.petitionType && r.petitionType !== f.petitionType) return false;
    if (f.q && !`${r.jurisdiction} ${r.abbr}`.toLowerCase().includes(String(f.q).toLowerCase())) return false;
    if (f.perSignature) {
      const ps = r.compensation?.perSignatureAllowed;
      if (f.perSignature === "go") { if (ps === "no") return false; } else if (ps !== f.perSignature) return false;
    }
    if (f.voterFileTier && r.voterFile?.tier !== f.voterFileTier) return false;
    if (truthy(f.freeVoterFile) && r.voterFile?.tier !== "FREE_DOWNLOAD") return false;
    if (f.gate && r.verification?.gate !== f.gate) return false;
    if (f.maxSignatures !== undefined && r.signatures.required > Number(f.maxSignatures)) return false;
    if (f.minSignatures !== undefined && r.signatures.required < Number(f.minSignatures)) return false;
    if (f.residencyRequired !== undefined) {
      const resid = r.compensation?.circulatorResidency && !/not.?required|none|n\/?a|^$/i.test(String(r.compensation.circulatorResidency));
      if (truthy(f.residencyRequired) !== !!resid) return false;
    }
    return true;
  });
}

export function stats(): any {
  const m = manifest();
  return { jurisdictions: m.jurisdictions, version: m.version, schemaVersion: m.schemaVersion, generatedAt: m.generatedAt, license: m.license, coverage: m.coverage };
}

// ── documented REST surface (a server is a thin wrapper over query/get/stats/schema) ──
export const ENDPOINTS = [
  { method: "GET", path: "/v1/rules", desc: "List rules; filter via query params (perSignature, voterFileTier, freeVoterFile, gate, maxSignatures, minSignatures, residencyRequired, q).", maps: "query(params)" },
  { method: "GET", path: "/v1/rules/:id", desc: "One jurisdiction by 2-letter abbr or full name.", maps: "get(id)" },
  { method: "GET", path: "/v1/stats", desc: "Manifest + coverage stats.", maps: "stats()" },
  { method: "GET", path: "/v1/schema", desc: "The JSON Schema records conform to.", maps: "schema()" },
];

/** Route an HTTP-style request to the query layer. Returns { status, body }. */
export function handle(method: string, path: string, params: Query = {}): { status: number; body: any } {
  if (method !== "GET") return { status: 405, body: { error: "method not allowed" } };
  const p = path.replace(/\/+$/, "");
  if (p === "/v1/rules") return { status: 200, body: query(params) };
  const one = p.match(/^\/v1\/rules\/([^/]+)$/);
  if (one) { const r = get(decodeURIComponent(one[1])); return r ? { status: 200, body: r } : { status: 404, body: { error: "not found" } }; }
  if (p === "/v1/stats") return { status: 200, body: stats() };
  if (p === "/v1/schema") return { status: 200, body: schema() };
  return { status: 404, body: { error: "no such endpoint", endpoints: ENDPOINTS.map((e) => `${e.method} ${e.path}`) } };
}
