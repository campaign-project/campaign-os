# RFC-002 Amendment A1 — Turf-Scoped Indexing & Layered Validation

**Amends:** `GATHER_APP_ARCHITECTURE.md` (RFC-002), §3 (offline validation) and §4 (data & sync model).
**Status:** Proposed · 2026-06-10.
**Supersedes:** the ZIP-list index scoping used in the v1 demo (`apps/mobile/scripts/build-indexes.mts`, `CAMPAIGNS[].zips`).

---

## 1. Why

RFC-002 §3 already states the on-device index unit is the **assignment** ("a few thousand records, KB–MB, encrypted"). The v1 build scoped by whole **ZIPs** instead, as a shortcut to get real data flowing. That deviation bit us:

- **103,557 voters / 25 MB** for 5 Charlotte ZIPs (28202–05 + 28211).
- Slow `buildIndex` (O(n) Map rebuild on every cold start), 25 MB to persist in SQLite and move over sync.
- Surfaced a real bug: the sync client's flat **6 s timeout** can't pull a 23 MB delta — index pulls silently aborted. (Fixed in `src/net/sync.ts`: index pulls now get a 90 s window; captures keep the fast 6 s.) With turf-sized (~1 MB) tiles this never arises.
- **Over-exposes PII** — a lost/stolen phone leaks a whole metro.

This amendment makes the assignment-scoped index concrete (a tile scheme), defines the prefetch lifecycle, and adds a **layered validation ladder** — local tiles, an offline statewide membership filter for dispersed venues (the ballpark case), a live online check, and server reconcile.

## 2. Scoping unit: the tile

```
optimizer assigns volunteer → a turf (walk-list polygon / blocks)
        │
turf → set of TILES it intersects + a 1-ring buffer
        │
server emits one minimized, content-addressed artifact per tile
   index/<campaign>/tiles/<cell>/<version>.json   (KB-scale, encrypted on device)
        │
device prefetches the turf's tiles (while online) → engine.core.js matches LOCALLY, offline
```

- **Tile = a spatial cell of the voter file.** Recommended: **H3 hexagon at resolution 8** (~0.7 km², uniform area, clean neighbor traversal via `kRing`). Geohash-6 is an acceptable alternative.
- **Tile contents:** minimal-field voter records (id, normalized name tokens, house number, ZIP, status) whose residence falls in the cell. Content-addressed (hash → version), immutable, CDN-cacheable, delta-friendly, encrypted at rest on device.
- **Size policy:** target ≤ ~2–4 k records / ≤ ~1 MB per tile. A dense urban cell that exceeds the cap **subdivides** to res 9. Define a hard max-records-per-tile and split on overflow.
- **A turf = the set of tiles** its walk-list/polygon intersects, plus a 1-ring buffer (so a circulator who drifts one block over still has local data).
- **Assignment type drives what's prefetched.** The optimizer tags each assignment: `door-to-door` → just the turf tiles (signers are local); `venue/booth` (stadium, fair, transit hub) → the campaign **membership filter** (§4, Tier 1b) **plus** the local tiles, because venue signers are geographically dispersed and won't be in any single turf. The prep download differs by mode; both happen on wifi before the shift.

**Net size:** a real door-to-door assignment is ~2–4 k voters ≈ **~1 MB**, vs 25 MB for 5 ZIPs vs ~1.5 GB statewide. A venue assignment adds the ~10 MB statewide membership filter. ~30–50× smaller than the demo, instant `buildIndex`, survives any dead zone.

## 3. Build (server)

- The builder buckets every voter into its tile cell and emits one minimized artifact per tile under `index/<campaign>/tiles/<cell>/<version>.json` in R2. **Implemented:** `apps/mobile/scripts/build-tiles.mts` (streams the statewide file, scoped to the campaign's coverage; spec-driven via `prototypes/validation-engine/sources.ts`).
- **Cell scheme — spec-driven, no geocoding required.** The primary cell is the state's own administrative **`tileCell`** (a new canonical field on the adapter: precinct / ward / election district — compact, ~turf-sized, already in the file). County-qualified (codes repeat across counties); oversize urban cells split into house-number bands at a record cap; rows missing a cell collapse into one `<county>__nocell` catch-all. NC declares `precinct_abbrv` → on the real file, the 5-ZIP Charlotte scope yields **50 tiles, median ~2.2k records, ~0.7 MB each**. States with **no** administrative cell fall back to **ZIP+street-segment** (also no geocoding). **Geocode→H3** stays the *future* option for finer, uniform-area cells (Census batch geocoder / rooftop set), not a prerequisite.
- Per-tile content-hash versioning reuses the existing delta/version machinery — no new sync semantics, just more (smaller) artifacts.
- **Ship precomputed search tokens.** Beyond the minimized fields (§2), emit the engine-normalized name tokens + house number that autocomplete (`suggestVoters`) scores against. The device then builds its typeahead corpus with **zero on-device normalization** — it just loads tokens into the suggestion map. Costs a few bytes per record, saves all client CPU, and makes the corpus build independent of device speed. (See §7.)
- **Emit a campaign membership filter** (§4, Tier 1b). Alongside the tiles, build a Bloom/XOR filter over the campaign's *entire eligible set* (statewide for a statewide petition; district-scoped otherwise), keyed on the engine-canonical identity. Key each voter **twice** — full canonical (`normName.full` + `normAddress` number/street/zip) **and** a coarser `surname + house# + zip` — so minor first-name variation still hits, at the cost of ~2× elements. Tunable FPR (~0.1–1% → ~13/9 MB for NC's ~7.5 M voters). Content-hash versioned and regenerated as the voter file refreshes, like any other artifact.

## 4. The validation ladder

The defining invariant: **never block capture.** Collection always proceeds; the tiers only change how fast and how confidently the verdict is annotated. A signature is never lost because data was missing locally.

```
 signer entered
      │
 ┌────▼──────────────────────────────────────────────┐
 │ TIER 1a — LOCAL TILES (offline, instant)            │  matchSigner() vs loaded turf tiles
 │   in-turf hit → VALID / NEEDS_REVIEW + the record    │  full fuzzy match + "did you mean", details
 └────┬───────────────────────────────────────────────┘
      │ not in any loaded tile (the dispersed-venue case)
      │
 ┌────▼──────────────────────────────────────────────┐
 │ TIER 1b — MEMBERSHIP FILTER (offline, instant)      │  Bloom/XOR over the campaign's eligible set
 │   hit → APPEARS REGISTERED (confirm) · miss → no     │  ~10MB statewide; yes/no, no record
 └────┬───────────────────────────────────────────────┘
      │ unresolved AND connectivity available
      │
 ┌────▼──────────────────────────────────────────────┐
 │ TIER 2 — ONLINE POINT-LOOKUP (if connected)         │  POST /verify/:campaign {name,address}
 │   server matches the FULL file → authoritative      │  ~100s of ms; real-time even out-of-turf
 └────┬───────────────────────────────────────────────┘
      │ offline / timeout
      │
 ┌────▼──────────────────────────────────────────────┐
 │ TIER 3 — SERVER RECONCILE ON SYNC (authoritative)   │  re-validate every capture at sync
 │   the async backstop; on-device verdict is preview  │  flips PENDING → VALID/INVALID; catches FPs
 └────────────────────────────────────────────────────┘
```

- **Tier 1a — Local tiles, offline, instant.** `matchSigner` against the in-turf tiles. Full fuzzy match, the matched record, and "did you mean". The door-to-door common case; no network.
- **Tier 1b — Membership filter, offline, instant (the ballpark case).** For a signer in **no loaded tile** — the dispersed-venue scenario (stadium, fair, transit hub) where signers come from everywhere *and* there's no signal — test a campaign-scoped **Bloom/XOR membership filter** of the eligible voter set. For a *statewide* petition, validity literally **is** set membership, and that set fits in **~10 MB statewide** (vs ~1.5 GB of records). Returns "**appears registered — confirm on sync**" or "not found"; it carries **no records** and does no fuzzy beyond the normalized key, so it's a confidence signal, not a match. Preloaded on wifi for venue assignments (§2). False positives are caught by Tier 3.
- **Tier 2 — Online point-lookup (the live check).** If 1a/1b leave it unresolved **and** connectivity is available, query the server, which matches the **full** campaign/state file and returns an authoritative verdict in ~100s of ms. Makes the out-of-turf signer (e.g. Kirk in 28211 signing an uptown circulator's statewide petition) verify in real time when online.
- **Tier 3 — Server reconcile on sync.** Every capture is re-validated server-side at sync regardless (already RFC-002 §4); the on-device verdict is always a "fast preview." The catch-all when offline at capture, and the authority that **resolves Tier-1b false positives** and near-misses — the signer is marked `PENDING` and flipped on reconcile.

**Decision table** (live verdict; Tier 3 is always the eventual authority)

| Situation at capture | Live verdict shown |
|---|---|
| In a loaded tile → match | **VALID** + matched record (preview) |
| Not in tile, **membership filter hit** | **APPEARS REGISTERED** — confirm on sync (preview) |
| Not in tile/filter, **online** | **Tier-2 `/verify`** → authoritative (preview) |
| Not in tile/filter, **offline** | **PENDING** — collected, Tier-3 reconciles |
| any of the above | **always** Tier-3 server reconcile (authoritative; resolves FPs) |

## 5. New endpoint: `POST /verify/:campaignId` (the Tier-2 oracle — guarded)

Request `{ name, address }` (normalized tokens preferred) → Response `{ verdict, band, score, matchedVoterId? }`.

The server runs the **same `@campaign-os/engine`** against the full campaign/state file. **Security — this is a voter-file lookup oracle and must be constrained:**
- **Rate-limit per device token** (e.g. N/min, M/day) — an unthrottled `/verify` is a scraping endpoint for the whole voter file.
- **Return a verdict, not a record.** Echo only `{verdict, band, score}` and a match boolean / opaque `matchedVoterId`; never the matched voter's name/address/details. The circulator already has the signer in front of them; they don't need to *browse* the file.
- **Audit every call** (device, campaign, timestamp) for abuse detection.
- Consider requiring the query address to substantially match before confirming, so it can't be used to fish addresses from a name alone.

These guards make Tier 2 a *confirmation* tool, not a *lookup* tool.

## 6. PII & security posture (strengthened)

- **Data minimization by design.** A tile is minimal-field, encrypted at rest (Keychain/Keystore key), and TTL'd to the assignment (§4). A compromised device leaks **one turf**, not a metro or a state. Coarse ZIP-dumps work against this; tiling reinforces the bright lines.
- The **full records live server-side only** (Tier 2 + Tier 3). The device never holds statewide voter *records* (RFC-002 §3, preserved).
- **The Tier-1b membership filter is statewide but carries no records** — only hashed bits. You can't enumerate or extract a name/address from it; you can only *test a guess you already have*. So a venue device gains statewide coverage without statewide PII: a lost phone leaks nothing browsable. (It is still encrypted at rest and TTL'd like a tile.)
- `/verify` oracle risk mitigated per §5.

## 7. On-device autocomplete (typeahead)

The shipped collect-screen autocomplete (`suggestVoters`, `getVoterList`) suggests registered voters from the resident index as the circulator types or dictates; a tap fills name+address and pre-resolves the match. Under turf scoping it stays cheap and incremental:

- **Per-tile corpus, not per-index.** Build the suggestion corpus once per tile and key it by the tile's immutable content-hash version, so it survives syncs *and* app restarts (a loaded tile's tokens never change). The suggester queries the **union of loaded tiles**; gaining or dropping a tile builds/evicts just that tile's corpus — never a full rebuild as the working set shifts.
- **Cost scales with the turf, not the nation.** Over a ~3 k-record turf the corpus builds in milliseconds, and the device never holds — let alone normalizes — the national file. The visible hitch today is 103 k demo records being normalized on first keystroke; it vanishes at turf scale, and entirely once tokens are shipped precomputed (§3).
- **Out-of-turf signers are NOT a national per-keystroke typeahead.** Suggesting against the full file as the user types would reintroduce the connectivity dependency *and* turn lookup into a live oracle (§5). Local autocomplete covers the in-turf ~99%; the rare out-of-turf signer types their full name+address once and **Tier-2 `/verify`** confirms it (one gated query when online), not one per keystroke.

## 8. Migration & impact

| Layer | Change |
|---|---|
| Builder (`build-indexes.mts`, `load.ts`, `sources.ts`) | ZIP-filter → cell-bucketing; add geocoding (ZIP-segment fallback); emit per-tile artifacts **+ precomputed search tokens + a campaign membership filter (Bloom/XOR)** |
| R2 layout | `index/<campaign>/tiles/<cell>/<version>.json` (per-tile) + `index/<campaign>/membership/<version>.bin` (the filter) |
| Worker | add `POST /verify/:campaignId` (rate-limited, minimal response, audited); tiles + filter served by the existing `/index` delta path |
| Client (`voterIndexStore.ts`) | turf → tile-set prefetch; hold multiple tiles; `matchSigner` across loaded tiles; tile TTL/eviction; neighbor prefetch on connectivity |
| Client membership filter (Tier 1b) | for `venue/booth` assignments, prefetch + test the campaign Bloom/XOR filter offline; encrypted at rest, TTL'd like a tile |
| Client autocomplete (`suggestVoters`, `getVoterList`) | per-tile corpus keyed by content-hash, queried over the union of loaded tiles; consume server-precomputed tokens (skip on-device normalization) |
| Client (`sync.ts`) | add Tier-2 `verify()` call; the 90 s index-pull window stays but is moot at ~1 MB/tile |
| Capture/verdict UI | `PENDING` + `APPEARS REGISTERED` (filter-hit) states + "confirm on sync"; reconcile flip on sync |

The sync *protocol* (delta, content-hash versions, push/pull) is unchanged — there are just more, smaller, versioned artifacts.

## 9. Open questions

- **Geocoding** source & coverage; precision of the ZIP+street-segment fallback when coords are missing.
- **H3 resolution** (res 8 vs 9) and the max-records-per-tile split policy for dense cells.
- **`/verify` policy**: exact rate limits, whether to gate on partial-address match, abuse heuristics.
- **Tile eviction / TTL** and buffer-ring size (how far a circulator can drift before a cache miss).
- **On-device encryption** key management (Keychain/Keystore) and tile-at-rest format (encrypted SQLite vs. blocked JSON vs. bloom prefilter — RFC-002 §8 line 215).
- **Autocomplete corpus**: ship precomputed tokens in the tile vs. normalize on device; per-tile corpus cache key (content-hash) and eviction in lockstep with tile eviction.
- **Membership filter (Tier 1b)**: structure (Bloom vs. XOR vs. binary-fuse — XOR/fuse are ~smaller and immutable, but Bloom is updatable); target FPR; the key scheme (canonical + coarse `surname+house#+zip`, and how much first-name tolerance is worth the ~2× size); regeneration cadence vs. voter-file churn; whether non-venue assignments should also carry it as a cheap safety net.
- Whether Tier-2 verdicts should be cached locally (they're a tiny addition to the working set).
