/**
 * Gather — reference sync server (dev).
 *
 * The server half of RFC-002's "device = cache, server = source of truth." Zero-dependency Node
 * HTTP. Three flows:
 *   GET  /index/:campaignId  — down-sync: ship the per-geography voter index (the loader's artifact)
 *   POST /captures           — up-sync: accept a batch, DEDUP across all volunteers (server-side),
 *                              update the yield rollup, return per-capture status + live movement
 *   GET  /movement           — the live collective rollup (what the app shows as "the movement")
 *
 * Dedup is the load-bearing server job: only the FIRST VALID signature per voter counts; later ones
 * (same device or a different volunteer) come back `duplicate`. That's why the device can't be the
 * source of truth — only the server sees everyone.
 *
 * Run:  node apps/mobile/server/sync-server.mjs        (PORT env overrides 8787)
 * The iOS simulator reaches this at http://localhost:8787 (shares the host network).
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
// Defaults to the committed synthetic artifacts. Operators serving REAL (gitignored) indexes run
// with INDEX_DIR=apps/mobile/voterfiles/out so real PII is never read from the repo tree.
const INDEX_DIR = process.env.INDEX_DIR ? resolve(process.env.INDEX_DIR) : join(HERE, "..", "src", "data", "indexes");
const PORT = Number(process.env.PORT) || 8787;

// In-memory state (resets on restart — it's a dev reference, not a database).
const seenByCampaign = new Map(); // campaignId → Set<matchedVoterId> (the dedup ledger)
const movement = { circulators: 1240, validThisWeek: 38902, states: 7 };
const prevIndex = new Map(); // campaignId → { version, voters } seen on the PRIOR /index request (delta base)

// Yield store (Moat B): validity-by-location, aggregated across all volunteers. Beta-Binomial
// smoothing shrinks low-sample zips toward the cold-start prior (so 1/1 isn't read as 100%).
const yieldByCampaign = new Map(); // campaignId → Map<zip, { valid, total }>
const PRIOR_A = 7, PRIOR_B = 3;    // ≈ 0.70 prior validity
const smooth = (valid, total) => (valid + PRIOR_A) / (total + PRIOR_A + PRIOR_B);

function yieldFor(campaignId) {
  let m = yieldByCampaign.get(campaignId);
  if (!m) { m = new Map(); yieldByCampaign.set(campaignId, m); }
  return m;
}

/** Record-level diff: which voters were added/changed, which removed (a real server keys this off
 *  per-record updatedAt + tombstones; here we diff the previous version's records against current). */
function diffVoters(oldV, newV) {
  const oldById = new Map(oldV.map((r) => [r.id, r]));
  const newById = new Map(newV.map((r) => [r.id, r]));
  const upserts = newV.filter((r) => JSON.stringify(oldById.get(r.id)) !== JSON.stringify(r));
  const removedIds = oldV.filter((r) => !newById.has(r.id)).map((r) => r.id);
  return { upserts, removedIds };
}

function seen(campaignId) {
  let s = seenByCampaign.get(campaignId);
  if (!s) { s = new Set(); seenByCampaign.set(campaignId, s); }
  return s;
}

/** Apply a batch: dedup VALIDs by matched voter, count yield, bump the live movement. */
function applyCaptures({ campaignId, captures }) {
  const ledger = seen(campaignId);
  const yld = yieldFor(campaignId);
  const results = [];
  let accepted = 0, duplicates = 0, recorded = 0;
  for (const c of captures ?? []) {
    // Yield: validity by location. Counts every capture (turf quality = % of signers who are valid).
    const zip = (c.address?.match(/\b(\d{5})\b\s*$/) || [])[1]; // trailing zip field, not a street number
    if (zip) {
      const e = yld.get(zip) ?? { valid: 0, total: 0 };
      e.total++;
      if (c.verdict === "VALID") e.valid++;
      yld.set(zip, e);
    }
    if (c.verdict === "VALID" && c.matchedVoterId) {
      if (ledger.has(c.matchedVoterId)) {
        duplicates++;
        results.push({ seq: c.seq, status: "duplicate", reason: `voter ${c.matchedVoterId} already signed` });
      } else {
        ledger.add(c.matchedVoterId);
        accepted++;
        movement.validThisWeek++; // a freshly-accepted valid signature joins the rollup
        results.push({ seq: c.seq, status: "accepted" });
      }
    } else {
      recorded++; // INVALID / NEEDS_REVIEW — kept for the record, doesn't count
      results.push({ seq: c.seq, status: "recorded", reason: c.verdict });
    }
  }
  return { results, accepted, duplicates, recorded, movement };
}

function send(res, code, body) {
  const json = JSON.stringify(body);
  res.writeHead(code, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "GET,POST,OPTIONS",
  });
  res.end(json);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  if (req.method === "OPTIONS") return send(res, 204, {});

  if (req.method === "GET" && url.pathname === "/health") return send(res, 200, { ok: true });
  if (req.method === "GET" && url.pathname === "/movement") return send(res, 200, movement);

  if (req.method === "GET" && url.pathname.startsWith("/yield/")) {
    const id = decodeURIComponent(url.pathname.slice("/yield/".length));
    const y = yieldByCampaign.get(id) ?? new Map();
    let tv = 0, tt = 0;
    const byZip = [...y.entries()]
      .map(([zip, e]) => { tv += e.valid; tt += e.total; return { zip, valid: e.valid, total: e.total, rate: smooth(e.valid, e.total) }; })
      .sort((a, b) => b.rate - a.rate);
    return send(res, 200, { overall: { valid: tv, total: tt, rate: smooth(tv, tt) }, byZip });
  }

  // Tile manifest (RFC-002-A1): the directory of cells + versions for a campaign.
  if (req.method === "GET" && url.pathname.startsWith("/manifest/")) {
    const id = decodeURIComponent(url.pathname.slice("/manifest/".length));
    try {
      return send(res, 200, JSON.parse(readFileSync(join(INDEX_DIR, "tiles", id, "manifest.json"), "utf8")));
    } catch {
      return send(res, 404, { error: `no manifest for "${id}"` });
    }
  }

  // Membership filter (RFC-002-A1 Tier 1b): the campaign's eligible-set Bloom filter.
  if (req.method === "GET" && url.pathname.startsWith("/membership/")) {
    const id = decodeURIComponent(url.pathname.slice("/membership/".length));
    try {
      return send(res, 200, JSON.parse(readFileSync(join(INDEX_DIR, "membership", `${id}.json`), "utf8")));
    } catch {
      return send(res, 404, { error: `no membership filter for "${id}"` });
    }
  }

  // The optimizer (RFC-002-A1): rank turfs by expected valid = voter density × yield (Moat B).
  if (req.method === "GET" && url.pathname.startsWith("/assignments/")) {
    const id = decodeURIComponent(url.pathname.slice("/assignments/".length));
    let manifest;
    try { manifest = JSON.parse(readFileSync(join(INDEX_DIR, "tiles", id, "manifest.json"), "utf8")); }
    catch { return send(res, 404, { error: `no manifest for "${id}"` }); }
    const yld = yieldByCampaign.get(id) ?? new Map();
    const rate = (zip) => { const e = yld.get(zip); return e ? smooth(e.valid, e.total) : smooth(0, 0); };
    const assignments = manifest.cells
      .map((c) => ({ c, r: rate(c.zip) }))
      .sort((a, b) => b.c.voterCount * b.r - a.c.voterCount * a.r)
      .slice(0, 12)
      .map(({ c, r }, i) => {
        const prec = c.cell.split("__").slice(1).join("-");
        return { id: `opt-${c.cell}`, campaignId: id, turf: [c.cell], label: `Precinct ${prec} · ${c.zip}`, areaShort: `Prec ${prec} · ${c.zip}`,
          expectedValid: Math.round(r * 100) / 100, voterCount: c.voterCount, rank: i + 1,
          directive: `~${c.voterCount} active registrations · ${Math.round(r * 100)}% expected valid${i === 0 ? " — your best turf right now." : "."}` };
      });
    return send(res, 200, { campaignId: id, basis: "expected valid = voter density × yield (Beta-Binomial smoothed)", assignments });
  }

  if (req.method === "GET" && url.pathname.startsWith("/index/")) {
    const id = decodeURIComponent(url.pathname.slice("/index/".length));
    // A compound id "<campaign>/tiles/<cell>" is a turf tile (build-tiles.mts layout); else a whole index.
    const tm = id.match(/^(.+)\/tiles\/(.+)$/);
    const filePath = tm ? join(INDEX_DIR, "tiles", tm[1], `${tm[2]}.json`) : join(INDEX_DIR, `${id}.json`);
    let a;
    try {
      a = JSON.parse(readFileSync(filePath, "utf8"));
    } catch {
      return send(res, 404, { error: `no index for "${id}"` });
    }
    const since = url.searchParams.get("since");
    const prev = prevIndex.get(id);
    let out;
    if (since && since === a.version) {
      out = { mode: "current", version: a.version }; // device is up to date — ~0 bytes
    } else if (since && prev && prev.version === since && prev.version !== a.version) {
      const { upserts, removedIds } = diffVoters(prev.voters, a.voters); // just what changed
      out = { mode: "delta", version: a.version, jurisdiction: a.jurisdiction, builtAt: a.builtAt, upserts, removedIds };
    } else {
      out = { mode: "snapshot", version: a.version, jurisdiction: a.jurisdiction, builtAt: a.builtAt, voterCount: a.voterCount, voters: a.voters };
    }
    prevIndex.set(id, { version: a.version, voters: a.voters }); // diff base for the next request
    console.log(`→ GET /index/${id}?since=${since ?? "-"} → ${out.mode}${out.mode === "delta" ? ` (+${out.upserts.length}/-${out.removedIds.length})` : ""}`);
    return send(res, 200, out);
  }

  if (req.method === "POST" && url.pathname === "/captures") {
    let body = "";
    req.on("data", (chunk) => { body += chunk; if (body.length > 2_000_000) req.destroy(); });
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const out = applyCaptures(payload);
        console.log(`→ POST /captures [${payload.campaignId}] ${out.accepted} accepted · ${out.duplicates} dup · ${out.recorded} recorded → validThisWeek=${movement.validThisWeek}`);
        return send(res, 200, out);
      } catch (e) {
        return send(res, 400, { error: String(e) });
      }
    });
    return;
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, () => console.log(`Gather sync server on http://localhost:${PORT}`));
