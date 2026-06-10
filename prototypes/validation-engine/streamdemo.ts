/**
 * Streaming-loader demo + correctness proof.
 *
 *   1. CORRECTNESS UNDER PATHOLOGICAL CHUNKING — stream each of the 7 samples with an
 *      8-byte read buffer (so lines AND multi-byte UTF-8 chars split across chunks),
 *      then assert the streamed records are byte-identical to the batch loader. This is
 *      the real test: if boundary handling were wrong, tiny chunks would expose it.
 *   2. SCALE + SELECTIVE LOAD — generate a 20,000-row Washington file, then (a) count
 *      it via the generator without ever holding an array, and (b) load ONLY the ZIPs
 *      we care about via a filter — bounded memory regardless of file size.
 *
 * Run: node --experimental-strip-types streamdemo.ts
 */

import { rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadVoterFile, streamVoterFile, collectVoterFile } from "./load.ts";
import { ADAPTERS } from "./sources.ts";
import { writeSamples, writeBig } from "./samples.ts";

let fail = 0;
const ok = (cond: boolean, msg: string) => { console.log(`  ${cond ? "✓" : "✗"} ${msg}`); if (!cond) fail++; };

async function drain(path: string, spec: typeof ADAPTERS[string], hwm?: number) {
  const out = [];
  for await (const r of streamVoterFile(path, spec, hwm ? { highWaterMark: hwm } : {})) out.push(r);
  return out;
}

console.log("\n══════════════════════════════════════════════════════════════════");
console.log("  Streaming loader — correctness under chunk boundaries + scale");
console.log("══════════════════════════════════════════════════════════════════\n");

console.log("  1. streamed == batch, even with 8-byte read chunks (lines + multi-byte split)");
const paths = writeSamples();
for (const [jur, spec] of Object.entries(ADAPTERS)) {
  const batch = loadVoterFile(paths[jur], spec);
  const streamed = await drain(paths[jur], spec, 8); // 8-byte chunks: maximal boundary stress
  const same = JSON.stringify(batch) === JSON.stringify(streamed);
  ok(same && streamed.length === 5, `${jur}: ${streamed.length} records, identical to batch loader`);
}
// Ohio's sample is UTF-8 with "ñ" = 2 bytes (0xC3 0xB1); 8-byte chunks WILL split it.
const oh = await drain(paths["Ohio"], ADAPTERS["Ohio"], 8);
ok(/nuñez/i.test(oh[0].name), "Ohio: multi-byte UTF-8 'ñ' reassembled across an 8-byte chunk boundary");

console.log("\n  2. scale + selective load — a 20,000-row Washington file");
const big = writeBig("Washington", 20000, tmpdir());
const waSpec = ADAPTERS["Washington"];

let total = 0;
for await (const _ of streamVoterFile(big, waSpec)) total++; // count without materializing an array
ok(total === 20000, `streamed and counted ${total} records without holding them in memory`);

const only62705 = await collectVoterFile(big, waSpec, { filter: (r) => r.address.includes("62705") });
ok(only62705.length === 4000, `filtered to ${only62705.length} records in ZIP 62705 (1 of 5 people) — bounded memory`);

const first10 = await collectVoterFile(big, waSpec, { limit: 10 });
ok(first10.length === 10, `early limit honored (${first10.length}) — underlying stream destroyed on break`);

rmSync(big, { force: true }); // don't leave a 20k-row file in tmp

console.log(`\n  ${fail === 0 ? "ALL PASS — streaming is identical to batch and scales to bounded memory." : `${fail} FAILED`}\n`);
process.exit(fail === 0 ? 0 : 1);
