# RFC-002 Amendment A1 — Turf-Scoped Indexing & Three-Tier Validation

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

This amendment makes the assignment-scoped index concrete (a tile scheme), defines the prefetch lifecycle, and adds a **three-tier validation ladder** — including the live over-the-network check for signers we don't hold locally.

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

**Net size:** a real assignment is ~2–4 k voters ≈ **~1 MB**, vs 25 MB for 5 ZIPs vs ~1.5 GB statewide. ~30–50× smaller than the demo, instant `buildIndex`, survives any dead zone.

## 3. Build (server)

- The builder (`prototypes/validation-engine/load.ts` + `sources.ts`) changes from **filter-by-ZIP-list** to **bucket-every-voter-into-its-cell**. Emit one artifact per tile under `index/<campaign>/tiles/<cell>/<version>.json` in R2.
- **Geocoding dependency (new):** voter files give addresses, not coordinates, so assigning a voter to an H3 cell needs geocoding (Census batch geocoder / local rooftop set). **Fallback when coords are absent: ZIP + street-name-prefix tiles** — no geocoding required, coarser but functional. Recommend geocode→H3 with ZIP-segment fallback.
- Per-tile content-hash versioning reuses the existing delta/version machinery — no new sync semantics, just more (smaller) artifacts.

## 4. Three-tier validation ladder

The defining invariant: **never block capture.** Collection always proceeds; the tiers only change how fast and how confidently the verdict is annotated. A signature is never lost because data was missing locally.

```
 signer entered
      │
 ┌────▼─────────────────────────────────────────────┐
 │ TIER 1 — LOCAL (offline, instant)                 │  matchSigner() vs loaded turf tiles
 │   in-turf hit → VALID / NEEDS_REVIEW / NO_MATCH    │  the common case, no network
 └────┬──────────────────────────────────────────────┘
      │ NO_MATCH / not-in-tile / low confidence
      │
 ┌────▼─────────────────────────────────────────────┐
 │ TIER 2 — ONLINE POINT-LOOKUP (if connected)        │  POST /verify/:campaign {name,address}
 │   server matches the FULL file → authoritative     │  ~100s of ms; real-time VALID even out-of-turf
 └────┬──────────────────────────────────────────────┘
      │ offline / timeout
      │
 ┌────▼─────────────────────────────────────────────┐
 │ TIER 3 — SERVER RECONCILE ON SYNC (authoritative)  │  re-validate every capture at sync (§4)
 │   the async backstop; on-device verdict is preview │  flips PENDING → VALID/INVALID
 └───────────────────────────────────────────────────┘
```

- **Tier 1 — Local, offline, instant.** `matchSigner` against the in-turf tiles. Common case; no network.
- **Tier 2 — Online point-lookup (the live check).** If Tier 1 is `NO_MATCH` / not-in-tile / low-confidence **and** connectivity is available, fire a single-record query to the server, which matches against the **full** campaign/state file and returns an authoritative verdict in ~100s of ms. **This is what makes the out-of-turf signer (e.g. Kirk in 28211 signing an uptown circulator's *statewide* petition) verify in real time when online.**
- **Tier 3 — Server reconcile on sync.** Every capture is re-validated server-side at sync regardless (already RFC-002 §4); the on-device verdict is always a "fast preview." This is the catch-all when Tier 2 wasn't reachable (offline at capture) — the signer is marked `PENDING` ("we'll confirm on sync") and flipped on reconcile.

**Decision table**

| Tier 1 result | Online? | Action |
|---|---|---|
| VALID (in turf) | — | record **VALID** (preview) · Tier 3 still reconciles |
| NO_MATCH / not-in-tile | yes | **Tier 2** point-lookup → use its verdict (preview) |
| NO_MATCH / not-in-tile | no | mark **PENDING / NEEDS_REVIEW** → Tier 3 reconciles |
| any | — | **always** Tier 3 reconcile at sync |

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
- The **full file lives server-side only** (Tier 2 + Tier 3). The device never holds the statewide file (RFC-002 §3, preserved).
- `/verify` oracle risk mitigated per §5.

## 7. Migration & impact

| Layer | Change |
|---|---|
| Builder (`build-indexes.mts`, `load.ts`, `sources.ts`) | ZIP-filter → cell-bucketing; add geocoding (ZIP-segment fallback); emit per-tile artifacts |
| R2 layout | `index/<campaign>/tiles/<cell>/<version>.json` (per-tile versions) |
| Worker | add `POST /verify/:campaignId` (rate-limited, minimal response, audited); tile artifacts served by the existing `/index` delta path, keyed per tile |
| Client (`voterIndexStore.ts`) | turf → tile-set prefetch; hold multiple tiles; `matchSigner` across loaded tiles; tile TTL/eviction; neighbor prefetch on connectivity |
| Client (`sync.ts`) | add Tier-2 `verify()` call; the 90 s index-pull window stays but is moot at ~1 MB/tile |
| Capture/verdict UI | `PENDING` state + "confirm on sync"; reconcile flip on sync |

The sync *protocol* (delta, content-hash versions, push/pull) is unchanged — there are just more, smaller, versioned artifacts.

## 8. Open questions

- **Geocoding** source & coverage; precision of the ZIP+street-segment fallback when coords are missing.
- **H3 resolution** (res 8 vs 9) and the max-records-per-tile split policy for dense cells.
- **`/verify` policy**: exact rate limits, whether to gate on partial-address match, abuse heuristics.
- **Tile eviction / TTL** and buffer-ring size (how far a circulator can drift before a cache miss).
- **On-device encryption** key management (Keychain/Keystore) and tile-at-rest format (encrypted SQLite vs. blocked JSON vs. bloom prefilter — RFC-002 §8 line 215).
- Whether Tier-2 verdicts should be cached locally (they're a tiny addition to the working set).
