/**
 * BallotAccessDB CLI — query the open dataset from the command line, and exercise the
 * documented HTTP API surface via the request router.
 *
 *   node --experimental-strip-types cli.ts get OH
 *   node --experimental-strip-types cli.ts query --free --max-sig=5000
 *   node --experimental-strip-types cli.ts query --per-sig=no
 *   node --experimental-strip-types cli.ts stats
 *   node --experimental-strip-types cli.ts endpoints
 *   node --experimental-strip-types cli.ts api GET /v1/rules/OH
 *   node --experimental-strip-types cli.ts demo        # sample queries + assertions (selftest)
 */

import { get, query, stats, ENDPOINTS, handle, manifest } from "./db.ts";

const argv = process.argv.slice(2);
const cmd = argv[0];
const flags: Record<string, string> = {};
const pos: string[] = [];
for (const a of argv.slice(1)) { const m = a.match(/^--([^=]+)(?:=(.*))?$/); if (m) flags[m[1]] = m[2] ?? "true"; else pos.push(a); }

const n = (x: number) => x.toLocaleString("en-US");
const J = (x: any) => JSON.stringify(x, null, 2);

function asQuery(): any {
  return {
    petitionType: flags["petition-type"],
    perSignature: flags["per-sig"], voterFileTier: flags["vf-tier"], freeVoterFile: flags["free"],
    gate: flags["gate"], maxSignatures: flags["max-sig"], minSignatures: flags["min-sig"],
    residencyRequired: flags["residency"], q: flags["q"],
  };
}
function table(rows: any[]) {
  console.log(`  abbr  ${"jurisdiction".padEnd(20)} ${"required".padStart(9)}  ${"voter-file".padEnd(13)} per-sig      gate`);
  for (const r of rows) console.log(`  ${r.abbr.padEnd(4)}  ${r.jurisdiction.padEnd(20)} ${n(r.signatures.required).padStart(9)}  ${(r.voterFile.tier || "—").padEnd(13)} ${(r.compensation.perSignatureAllowed || "—").padEnd(11)} ${r.verification.gate}`);
  console.log(`  — ${rows.length} jurisdiction(s)`);
}

if (cmd === "get") {
  const r = get(pos[0] || "");
  console.log(r ? J(r) : `not found: ${pos[0]}`);
  process.exit(r ? 0 : 1);
} else if (cmd === "query") {
  table(query(asQuery()));
} else if (cmd === "stats") {
  console.log(J(stats()));
} else if (cmd === "endpoints") {
  console.log("\n  BallotAccessDB v" + manifest().version + " — HTTP API (a server wraps db.ts):\n");
  for (const e of ENDPOINTS) console.log(`  ${e.method.padEnd(4)} ${e.path.padEnd(20)} ${e.desc}`);
  console.log("");
} else if (cmd === "api") {
  const res = handle(pos[0] || "GET", pos[1] || "/", asQuery());
  console.log(`HTTP ${res.status}`);
  console.log(J(Array.isArray(res.body) ? { count: res.body.length, sample: res.body.slice(0, 3).map((r: any) => r.abbr) } : res.body));
  process.exit(res.status < 400 ? 0 : 1);
} else if (cmd === "demo") {
  let fail = 0;
  const ok = (c: boolean, m: string) => { console.log(`  ${c ? "✓" : "✗"} ${m}`); if (!c) fail++; };
  console.log("\nBallotAccessDB — query demo / selftest\n");
  ok(query().length >= 110, `dataset has ${query().length} records (51 presidential + ballot-initiative measures)`);
  ok(query({ petitionType: "independent-presidential" }).length === 51, "51 independent-presidential records");
  ok(query({ petitionType: "initiated-statute" }).length === 24, `${query({ petitionType: "initiated-statute" }).length} initiated-statute records`);
  ok(query({ petitionType: "initiated-constitutional-amendment" }).length >= 17, `${query({ petitionType: "initiated-constitutional-amendment" }).length} initiated-constitutional-amendment records`);
  const mi = get("MI-ICA");
  ok(!!mi && mi.signatures.required === 446198 && mi.petitionType === "initiated-constitutional-amendment", "get('MI-ICA') → Michigan initiative (446,198 sigs)");
  ok(get("MI")?.petitionType === "independent-presidential", "bare 'MI' still resolves to the presidential record");
  const oh = get("OH");
  ok(!!oh && oh.signatures.required === 5000 && oh.voterFile.tier === "FREE_DOWNLOAD", "get('OH') → 5,000 sigs, free-download voter file");
  ok(get("Ohio")?.abbr === "OH", "get by full name works");
  const free = query({ petitionType: "independent-presidential", freeVoterFile: true });
  ok(free.length === 3 && free.every((r) => r.voterFile.tier === "FREE_DOWNLOAD"), `presidential freeVoterFile → ${free.length} (NC/OH/MS)`);
  const cheapAndEasy = query({ petitionType: "independent-presidential", freeVoterFile: true, maxSignatures: 5000, perSignature: "go" });
  ok(cheapAndEasy.length >= 1, `composable filter (presidential · free + ≤5k sigs + per-sig OK) → ${cheapAndEasy.length}: ${cheapAndEasy.map((r) => r.abbr).join(", ")}`);
  const hourly = query({ petitionType: "independent-presidential", perSignature: "no" });
  ok(hourly.length === 4, `presidential perSignature=no → ${hourly.length} (${hourly.map((r) => r.abbr).join(", ")})`);
  ok(handle("GET", "/v1/rules/OH").status === 200, "API: GET /v1/rules/OH → 200");
  ok(handle("GET", "/v1/rules/ZZ").status === 404, "API: GET /v1/rules/ZZ → 404");
  ok(handle("POST", "/v1/rules").status === 405, "API: POST → 405");
  ok(handle("GET", "/v1/rules", { petitionType: "independent-presidential", freeVoterFile: true } as any).body.length === 3, "API: query params flow through the router");
  const everyHasCites = query().every((r) => Array.isArray(r.citations));
  ok(everyHasCites, "every record carries primary-source citations + provenance");
  console.log(`\n  ${fail === 0 ? "ALL PASS — the open dataset is queryable as a library and via the documented API." : `${fail} FAILED`}\n`);
  process.exit(fail ? 1 : 0);
} else {
  console.log("usage: cli.ts <get|query|stats|endpoints|api|demo> [...]\n  e.g. cli.ts get OH · cli.ts query --free --max-sig=5000 · cli.ts demo");
  process.exit(1);
}
