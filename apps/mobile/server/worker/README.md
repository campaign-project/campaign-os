# Gather Sync — Cloudflare Worker

The hardened, hostable sync API: **Workers** (compute) + **D1** (dedup ledger, yield, movement, tokens) + **R2** (private voter-index artifacts) + **bearer-token auth**. Same contract the app speaks; `server/sync-server.mjs` remains the no-auth local dev reference.

## Why this shape
- **Voter PII never goes public.** Minimized index artifacts live in a *private* R2 bucket; the Worker serves them only to authenticated, campaign-scoped device tokens. Raw voter files never touch this — they stay in the operator's `voterfiles/` and are turned into minimized artifacts by `build-indexes.mts`.
- **Persistent + authed** — the two things the dev reference lacked.

## One-time setup
```bash
cd apps/mobile/server/worker
npm install

wrangler d1 create gather                     # → paste database_id into wrangler.toml
wrangler r2 bucket create gather-indexes       # keep PRIVATE (no public domain)
npm run schema:remote                          # apply schema.sql to D1

# Replace the placeholder tokens with real ones:
TOK=$(openssl rand -hex 24); ADM=$(openssl rand -hex 24)
wrangler d1 execute gather --remote --command \
  "DELETE FROM tokens; INSERT INTO tokens VALUES ('$TOK','device',NULL),('$ADM','admin',NULL);"
echo "device token: $TOK   admin token: $ADM"

npm run deploy                                 # → https://gather-sync.<subdomain>.workers.dev
```

## Publishing a (real, minimized) index — the operator flow
```bash
# 1. build the minimized artifact from a lawfully-obtained file (raw never leaves your machine)
cd apps/mobile && node --experimental-strip-types scripts/build-indexes.mts --real

# 2. upload it (admin token) — the Worker stores it in R2 + records the current version in D1
curl -X PUT https://gather-sync.<subdomain>.workers.dev/index/nc-independent \
  -H "authorization: Bearer $ADM" -H 'content-type: application/json' \
  --data-binary @voterfiles/out/nc-independent.json
```
Devices then `GET /index/:id?since=<version>` → `current` / `delta` / `snapshot` (R2 version history).

## Point the app at it
Set the app's `SYNC_BASE_URL` to the Worker URL and `SYNC_TOKEN` to the device token (see `src/net/sync.ts`).

## Local dev (Miniflare — real D1 + R2 emulation, no cloud)
```bash
npm run schema:local        # apply schema to the local D1
npm run dev                  # wrangler dev --local → http://localhost:8787
# the app's default localhost:8787 + dev token hits this exactly like the Node reference did
```

## Endpoints
`GET /health` · `GET /movement` · `GET /yield/:id` · `GET /index/:id?since=V` · `POST /captures` · `PUT /index/:id` (admin)
All except `/health` require `Authorization: Bearer <token>`; device tokens may be scoped to one campaign.
