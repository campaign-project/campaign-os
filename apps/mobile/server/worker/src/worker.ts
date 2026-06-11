/**
 * Gather sync — production Worker (Cloudflare).
 *
 * The hardened version of server/sync-server.mjs: persistent (D1) + authenticated (bearer token) +
 * voter indexes in R2 (private bucket, never a CDN). Same contract the app already speaks:
 *   GET  /health
 *   GET  /movement                      → live rollup (D1)
 *   GET  /yield/:campaignId             → validity-by-zip, Beta-Binomial smoothed (D1)
 *   GET  /index/:id?since=V             → current / delta / snapshot (R2 version history)
 *   GET  /manifest/:campaignId          → tile directory: cells + versions (R2)
 *   POST /captures                      → server-side dedup + yield + movement (D1)
 *   PUT  /index/:id                     → operator upload of a built index artifact (admin token)
 *   PUT  /manifest/:campaignId          → operator upload of a tile manifest (admin token)
 *
 * Tiles (RFC-002-A1) ride the same /index machinery via a compound id "<campaign>/tiles/<cell>":
 * a tile is just a small index, so delta/version history work per-tile for free.
 *
 * Auth: Authorization: Bearer <token>. Tokens live in D1 `tokens` (role device|admin, optional
 * campaign scope). Device tokens may be locked to one campaign; admin tokens may PUT indexes.
 * Voter PII (the index artifacts) lives only in R2 + flows to devices minimized — never public.
 */
// Tier 2 (RFC-002-A1 §5) runs the SAME engine matcher server-side — bundled by wrangler/esbuild from
// the workspace (pure TS, no platform deps), so /verify returns verdicts identical to the device.
import { buildIndex, validateSigner, makeContext, type VoterIndex } from "../../../../../packages/engine/src/index";

interface Env {
  DB: D1Database;
  INDEXES: R2Bucket;
}

interface VoterRecord {
  id: string; name: string; address: string; status: string;
  registeredOn?: string; county?: string; district?: string;
}

// Tier-2 caches (per warm isolate): the built match index per (campaign,version), and a coarse
// per-token rate limiter — the /verify oracle guard (§5). Production wants a durable D1/KV limiter.
const verifyIndexCache = new Map<string, VoterIndex>();
const verifyRate = new Map<string, number[]>();
const VERIFY_PER_MIN = 60;

const PRIOR_A = 7, PRIOR_B = 3; // Beta-Binomial cold-start prior ≈ 0.70
const smooth = (valid: number, total: number) => (valid + PRIOR_A) / (total + PRIOR_A + PRIOR_B);

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type,authorization",
      "access-control-allow-methods": "GET,POST,PUT,OPTIONS",
    },
  });
}

function bearer(req: Request): string | null {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

interface Token { role: string; campaign_id: string | null }

/** Resolve+authorize the token. Returns the token row, or a Response to short-circuit (401/403). */
async function authorize(req: Request, env: Env, opts: { campaignId?: string; admin?: boolean }): Promise<Token | Response> {
  const tok = bearer(req);
  if (!tok) return json({ error: "missing bearer token" }, 401);
  const row = await env.DB.prepare("SELECT role, campaign_id FROM tokens WHERE token = ?").bind(tok).first<Token>();
  if (!row) return json({ error: "invalid token" }, 401);
  if (opts.admin && row.role !== "admin") return json({ error: "admin token required" }, 403);
  if (opts.campaignId && row.campaign_id && row.campaign_id !== opts.campaignId) {
    return json({ error: "token not authorized for this campaign" }, 403);
  }
  return row;
}

function diffVoters(oldV: VoterRecord[], newV: VoterRecord[]) {
  const oldById = new Map(oldV.map((r) => [r.id, r]));
  const newById = new Map(newV.map((r) => [r.id, r]));
  const upserts = newV.filter((r) => JSON.stringify(oldById.get(r.id)) !== JSON.stringify(r));
  const removedIds = oldV.filter((r) => !newById.has(r.id)).map((r) => r.id);
  return { upserts, removedIds };
}

async function readArtifact(env: Env, campaignId: string, version: string): Promise<{ voters: VoterRecord[]; jurisdiction: string; builtAt: string } | null> {
  const obj = await env.INDEXES.get(`indexes/${campaignId}/${version}.json`);
  if (!obj) return null;
  return (await obj.json()) as { voters: VoterRecord[]; jurisdiction: string; builtAt: string };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;
    if (req.method === "OPTIONS") return json({}, 204);
    if (req.method === "GET" && path === "/health") return json({ ok: true });

    // --- GET /movement ---
    if (req.method === "GET" && path === "/movement") {
      const auth = await authorize(req, env, {});
      if (auth instanceof Response) return auth;
      const m = await env.DB.prepare("SELECT circulators, valid_this_week, states FROM movement WHERE id = 1").first<{ circulators: number; valid_this_week: number; states: number }>();
      return json({ circulators: m?.circulators ?? 0, validThisWeek: m?.valid_this_week ?? 0, states: m?.states ?? 0 });
    }

    // --- GET /yield/:campaignId ---
    if (req.method === "GET" && path.startsWith("/yield/")) {
      const id = decodeURIComponent(path.slice("/yield/".length));
      const auth = await authorize(req, env, { campaignId: id });
      if (auth instanceof Response) return auth;
      const { results } = await env.DB.prepare("SELECT zip, valid, total FROM yield WHERE campaign_id = ?").bind(id).all<{ zip: string; valid: number; total: number }>();
      let tv = 0, tt = 0;
      const byZip = (results ?? []).map((e) => { tv += e.valid; tt += e.total; return { zip: e.zip, valid: e.valid, total: e.total, rate: smooth(e.valid, e.total) }; })
        .sort((a, b) => b.rate - a.rate);
      return json({ overall: { valid: tv, total: tt, rate: smooth(tv, tt) }, byZip });
    }

    // --- GET /manifest/:campaignId  (tile directory: cells + versions) ---
    if (req.method === "GET" && path.startsWith("/manifest/")) {
      const id = decodeURIComponent(path.slice("/manifest/".length));
      const auth = await authorize(req, env, { campaignId: id.split("/")[0] });
      if (auth instanceof Response) return auth;
      const obj = await env.INDEXES.get(`manifests/${id}.json`);
      if (!obj) return json({ error: `no manifest for "${id}"` }, 404);
      return json(await obj.json());
    }

    // --- GET /assignments/:campaignId  (the optimizer: rank turfs by expected valid signatures) ---
    if (req.method === "GET" && path.startsWith("/assignments/")) {
      const id = decodeURIComponent(path.slice("/assignments/".length));
      const auth = await authorize(req, env, { campaignId: id.split("/")[0] });
      if (auth instanceof Response) return auth;
      const mObj = await env.INDEXES.get(`manifests/${id}.json`);
      if (!mObj) return json({ error: `no manifest for "${id}"` }, 404);
      const manifest = (await mObj.json()) as { cells: Array<{ cell: string; voterCount: number; zip: string }> };
      // Per-ZIP yield (Beta-Binomial smoothed, Moat B); ZIPs with no captures fall to the cold prior.
      const { results } = await env.DB.prepare("SELECT zip, valid, total FROM yield WHERE campaign_id = ?").bind(id).all<{ zip: string; valid: number; total: number }>();
      const rateByZip = new Map<string, number>();
      for (const r of results ?? []) rateByZip.set(r.zip, smooth(r.valid, r.total));
      const assignments = manifest.cells
        .map((c) => { const rate = rateByZip.get(c.zip) ?? smooth(0, 0); return { c, rate, score: c.voterCount * rate }; })
        .sort((a, b) => b.score - a.score)
        .slice(0, 12)
        .map(({ c, rate }, i) => {
          const prec = c.cell.split("__").slice(1).join("-"); // precinct (+ band)
          return {
            id: `opt-${c.cell}`, campaignId: id, turf: [c.cell],
            label: `Precinct ${prec} · ${c.zip}`, areaShort: `Prec ${prec} · ${c.zip}`,
            expectedValid: Math.round(rate * 100) / 100, voterCount: c.voterCount, rank: i + 1,
            directive: `~${c.voterCount.toLocaleString()} active registrations · ${Math.round(rate * 100)}% expected valid${i === 0 ? " — your best turf right now." : "."}`,
          };
        });
      return json({ campaignId: id, basis: "expected valid = voter density × yield (Beta-Binomial smoothed)", assignments });
    }

    // --- GET /membership/:campaignId  (Tier 1b eligible-set Bloom filter; ~10MB, streamed) ---
    if (req.method === "GET" && path.startsWith("/membership/")) {
      const id = decodeURIComponent(path.slice("/membership/".length));
      const auth = await authorize(req, env, { campaignId: id.split("/")[0] });
      if (auth instanceof Response) return auth;
      const obj = await env.INDEXES.get(`membership/${id}.json`);
      if (!obj) return json({ error: `no membership filter for "${id}"` }, 404);
      return new Response(obj.body, { headers: { "content-type": "application/json", "access-control-allow-origin": "*" } });
    }

    // --- GET /index/:id?since=V  (id may be a campaign or a compound "<campaign>/tiles/<cell>") ---
    if (req.method === "GET" && path.startsWith("/index/")) {
      const id = decodeURIComponent(path.slice("/index/".length));
      const auth = await authorize(req, env, { campaignId: id.split("/")[0] });
      if (auth instanceof Response) return auth;
      const meta = await env.DB.prepare("SELECT version, voter_count, built_at, jurisdiction FROM index_meta WHERE campaign_id = ?").bind(id).first<{ version: string; voter_count: number; built_at: string; jurisdiction: string }>();
      if (!meta) return json({ error: `no index for "${id}"` }, 404);
      const since = url.searchParams.get("since");
      if (since && since === meta.version) return json({ mode: "current", version: meta.version });

      const current = await readArtifact(env, id, meta.version);
      if (!current) return json({ error: "index artifact missing in R2" }, 500);
      if (since) {
        const prev = await readArtifact(env, id, since);
        if (prev) {
          const { upserts, removedIds } = diffVoters(prev.voters, current.voters);
          return json({ mode: "delta", version: meta.version, jurisdiction: meta.jurisdiction, builtAt: meta.built_at, upserts, removedIds });
        }
      }
      return json({ mode: "snapshot", version: meta.version, jurisdiction: meta.jurisdiction, builtAt: meta.built_at, voterCount: meta.voter_count, voters: current.voters });
    }

    // --- POST /verify/:campaignId  (Tier 2: authoritative online point-lookup; rate-limited, verdict-only) ---
    if (req.method === "POST" && path.startsWith("/verify/")) {
      const id = decodeURIComponent(path.slice("/verify/".length));
      const auth = await authorize(req, env, { campaignId: id.split("/")[0] });
      if (auth instanceof Response) return auth;
      const tok = bearer(req)!;
      const now = Date.now();
      const hits = (verifyRate.get(tok) ?? []).filter((t) => now - t < 60_000);
      if (hits.length >= VERIFY_PER_MIN) return json({ error: "rate limited — slow down" }, 429); // §5 oracle guard
      hits.push(now); verifyRate.set(tok, hits);

      const body = (await req.json().catch(() => null)) as { name?: string; address?: string } | null;
      if (!body?.name || !body?.address) return json({ error: "name + address required" }, 400);

      // Statewide blocking: fetch just the signer's ZIP shard (a few k voters) and match it. Falls
      // back to the campaign's monolithic index where no shard exists (smaller scope, still useful).
      const zip5 = body.address.match(/(\d{5})(?:-\d{4})?\s*$/)?.[1] ?? "";
      let voters: VoterRecord[] | null = null, jurisdiction = "", cacheKey = "";
      if (zip5) {
        const shard = await env.INDEXES.get(`verify/${id}/zip/${zip5}.json`);
        if (shard) {
          const d = (await shard.json()) as { voters: VoterRecord[]; jurisdiction: string; version: string };
          voters = d.voters; jurisdiction = d.jurisdiction; cacheKey = `vfy:${id}:${zip5}:${d.version}`;
        }
      }
      if (!voters) {
        const meta = await env.DB.prepare("SELECT version, jurisdiction FROM index_meta WHERE campaign_id = ?").bind(id).first<{ version: string; jurisdiction: string }>();
        if (!meta) return json({ error: `no records for "${id}"` }, 404);
        const art = await readArtifact(env, id, meta.version);
        if (!art) return json({ error: "index artifact missing in R2" }, 500);
        voters = art.voters; jurisdiction = meta.jurisdiction; cacheKey = `vfy:${id}:mono:${meta.version}`;
      }
      let index = verifyIndexCache.get(cacheKey);
      if (!index) { index = buildIndex(voters as Parameters<typeof buildIndex>[0]); verifyIndexCache.set(cacheKey, index); }
      const v = validateSigner({ id: "verify", name: body.name, address: body.address, capture: "wet" } as Parameters<typeof validateSigner>[0], index, makeContext(jurisdiction));
      // §5: verdict + opaque matched id only — never the matched voter's name/address/details.
      console.log(`verify[${id}] zip=${zip5 || "-"} src=${cacheKey.includes(":mono:") ? "mono" : "shard"} → ${v.verdict}/${v.band} ${v.score.toFixed(2)}`);
      return json({ verdict: v.verdict, band: v.band, score: v.score, matched: !!v.matchedVoterId, matchedVoterId: v.matchedVoterId ?? null });
    }

    // --- PUT /verify-shard/:campaignId/:zip5  (operator upload of a ZIP record shard; admin token) ---
    if (req.method === "PUT" && path.startsWith("/verify-shard/")) {
      const rest = decodeURIComponent(path.slice("/verify-shard/".length));
      const slash = rest.lastIndexOf("/");
      if (slash < 0) return json({ error: "path: /verify-shard/<campaign>/<zip5>" }, 400);
      const auth = await authorize(req, env, { admin: true });
      if (auth instanceof Response) return auth;
      const txt = await req.text();
      if (!txt) return json({ error: "empty shard" }, 400);
      await env.INDEXES.put(`verify/${rest.slice(0, slash)}/zip/${rest.slice(slash + 1)}.json`, txt);
      return json({ ok: true, zip: rest.slice(slash + 1) });
    }

    // --- POST /captures ---
    if (req.method === "POST" && path === "/captures") {
      const body = (await req.json().catch(() => null)) as { campaignId: string; gathererId?: string; captures: Array<{ seq: number; address?: string; verdict: string; matchedVoterId?: string }> } | null;
      if (!body) return json({ error: "bad json" }, 400);
      const auth = await authorize(req, env, { campaignId: body.campaignId });
      if (auth instanceof Response) return auth;

      const results: Array<{ seq: number; status: string; reason?: string }> = [];
      let accepted = 0, duplicates = 0, recorded = 0;
      const yieldDelta = new Map<string, { valid: number; total: number }>();

      for (const c of body.captures ?? []) {
        const zip = (c.address?.match(/\b(\d{5})\b\s*$/) || [])[1];
        if (zip) { const e = yieldDelta.get(zip) ?? { valid: 0, total: 0 }; e.total++; if (c.verdict === "VALID") e.valid++; yieldDelta.set(zip, e); }

        if (c.verdict === "VALID" && c.matchedVoterId) {
          const r = await env.DB.prepare("INSERT INTO dedup (campaign_id, voter_id) VALUES (?, ?) ON CONFLICT DO NOTHING").bind(body.campaignId, c.matchedVoterId).run();
          if (r.meta.changes && r.meta.changes > 0) { accepted++; results.push({ seq: c.seq, status: "accepted" }); }
          else { duplicates++; results.push({ seq: c.seq, status: "duplicate", reason: `voter ${c.matchedVoterId} already signed` }); }
        } else {
          recorded++; results.push({ seq: c.seq, status: "recorded", reason: c.verdict });
        }
      }

      // Flush yield + movement (one batch).
      const stmts = [];
      for (const [zip, e] of yieldDelta) {
        stmts.push(env.DB.prepare("INSERT INTO yield (campaign_id, zip, valid, total) VALUES (?,?,?,?) ON CONFLICT(campaign_id,zip) DO UPDATE SET valid = valid + excluded.valid, total = total + excluded.total").bind(body.campaignId, zip, e.valid, e.total));
      }
      if (accepted > 0) stmts.push(env.DB.prepare("UPDATE movement SET valid_this_week = valid_this_week + ? WHERE id = 1").bind(accepted));
      if (stmts.length) await env.DB.batch(stmts);

      const m = await env.DB.prepare("SELECT circulators, valid_this_week, states FROM movement WHERE id = 1").first<{ circulators: number; valid_this_week: number; states: number }>();
      return json({ results, accepted, duplicates, recorded, movement: { circulators: m?.circulators ?? 0, validThisWeek: m?.valid_this_week ?? 0, states: m?.states ?? 0 } });
    }

    // --- PUT /manifest/:campaignId  (operator upload; admin token) ---
    if (req.method === "PUT" && path.startsWith("/manifest/")) {
      const id = decodeURIComponent(path.slice("/manifest/".length));
      const auth = await authorize(req, env, { admin: true });
      if (auth instanceof Response) return auth;
      const body = await req.text();
      if (!body) return json({ error: "empty manifest" }, 400);
      await env.INDEXES.put(`manifests/${id}.json`, body);
      return json({ ok: true });
    }

    // --- PUT /membership/:campaignId  (operator upload; admin token) ---
    if (req.method === "PUT" && path.startsWith("/membership/")) {
      const id = decodeURIComponent(path.slice("/membership/".length));
      const auth = await authorize(req, env, { admin: true });
      if (auth instanceof Response) return auth;
      const body = await req.text();
      if (!body) return json({ error: "empty filter" }, 400);
      await env.INDEXES.put(`membership/${id}.json`, body);
      return json({ ok: true });
    }

    // --- PUT /index/:id  (operator upload; admin token; id may be a compound tile id) ---
    if (req.method === "PUT" && path.startsWith("/index/")) {
      const id = decodeURIComponent(path.slice("/index/".length));
      const auth = await authorize(req, env, { admin: true });
      if (auth instanceof Response) return auth;
      const art = (await req.json().catch(() => null)) as { version: string; jurisdiction: string; builtAt: string; voterCount: number; voters: VoterRecord[] } | null;
      if (!art || !art.version || !Array.isArray(art.voters)) return json({ error: "bad artifact" }, 400);
      await env.INDEXES.put(`indexes/${id}/${art.version}.json`, JSON.stringify({ voters: art.voters, jurisdiction: art.jurisdiction, builtAt: art.builtAt }));
      await env.DB.prepare("INSERT INTO index_meta (campaign_id, version, voter_count, built_at, jurisdiction) VALUES (?,?,?,?,?) ON CONFLICT(campaign_id) DO UPDATE SET version=excluded.version, voter_count=excluded.voter_count, built_at=excluded.built_at, jurisdiction=excluded.jurisdiction")
        .bind(id, art.version, art.voterCount ?? art.voters.length, art.builtAt ?? "", art.jurisdiction ?? "").run();
      return json({ ok: true, version: art.version, voterCount: art.voters.length });
    }

    return json({ error: "not found" }, 404);
  },
};
