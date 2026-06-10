# Voter-File Acquisition Runbook (free-file states)

**Status:** operator runbook · drafted 2026-06-08 · **Not legal advice.**
**Read first:** [`VOTER_FILE_LAWFUL_BASIS.md`](./VOTER_FILE_LAWFUL_BASIS.md) (the gate) · [`VOTER_FILE_ACQUISITION.md`](./VOTER_FILE_ACQUISITION.md) (the full 51-state map)

This is how an **operator** turns a lawfully-obtained voter file into the minimized per-campaign index the app uses — **without raw PII ever entering git or the app bundle.**

## Non-negotiable rules

1. **Confirm lawful basis per state before fetching** (the memo). The 7 free states are free to *obtain*, not unrestricted to *use* — use is limited to political/election purposes; misuse is criminal (e.g. CA Elec. Code §18109). Petition verification is a permitted electoral use; a SaaS verification service still needs the operator to qualify as an eligible recipient (operator-direct or authorized-vendor).
2. **Raw files live only in `apps/mobile/voterfiles/` (gitignored). Never commit them.**
3. **Real minimized artifacts (`voterfiles/out/`) are also gitignored** — they're real names+addresses, scoped but still PII. They reach devices over the **sync channel** (`/index/:id`), never the committed `src/data/indexes/` demo artifacts and never the app bundle.
4. The committed demo artifacts stay **synthetic**.

## The 7 free states — how each is actually obtained

| State | Method | Automatable? |
|---|---|---|
| **NC** | Single public S3 zip (~516MB, tab/win-1252) | ✅ one `curl` |
| **OH** | SoS ORDS portal, **per-county** CSVs → concatenate | ⚠️ portal, then merge |
| **MS** | Weekly distribution — Smartsheet enrollment → emailed ShareFile link | ❌ request |
| **FL** | Free by email request (monthly disk extract) | ❌ request |
| **OK** | Free, behind an approved EDW full-access account | ❌ account + request |
| **VT** | Free by signed affidavit | ❌ affidavit |
| **WA** | Free via emailed download link (online webform) | ❌ request |

Only **NC** is a true one-command fetch. The exact URLs/layout docs for all of them live in `prototypes/validation-engine/sources.ts` (each adapter's `downloadUrl` + `layoutDocUrl`).

NC (operator-run, after confirming lawful basis):
```bash
mkdir -p apps/mobile/voterfiles
curl -L -o apps/mobile/voterfiles/North_Carolina.zip \
  https://s3.amazonaws.com/dl.ncsbe.gov/data/ncvoter_Statewide.zip
unzip -o apps/mobile/voterfiles/North_Carolina.zip -d apps/mobile/voterfiles/
# → leaves the tab-delimited file in voterfiles/ (gitignored); name it so it starts with "North_Carolina"
```

## Turn a real file into minimized artifacts

Once a lawfully-obtained file sits in `apps/mobile/voterfiles/<State>.*`:

```bash
cd apps/mobile
# scopes each campaign to its zips + minimizes via the real adapter → voterfiles/out/<id>.json (gitignored)
node --experimental-strip-types scripts/build-indexes.mts --real

# serve the REAL artifacts (note INDEX_DIR points OUTSIDE the committed tree)
INDEX_DIR=apps/mobile/voterfiles/out node server/sync-server.mjs
```

The loader streams the file (bounded memory even at 516MB), keeps only the campaign's zips, and extracts only canonical fields — DOB/phone/etc. are never read. The artifact shape is identical to the synthetic one, so **nothing in the app changes**.

## Getting the real index onto devices

Today the app *bundles* the synthetic artifacts and the server *serves* whatever `INDEX_DIR` points at via `GET /index/:id`. The remaining wiring (noted as next) is to have the app **pull** its index from `/index/:id` (the `pullIndex` client already exists) and cache it, instead of using the bundled copy — so real data flows device-ward over the wire, never in the binary.

## What this repo will not do

- Download voter PII in CI / the dev sandbox.
- Commit raw files or real (non-synthetic) artifacts.
- Bundle real per-voter PII into the app.

All real-data steps are the operator's, on operator infrastructure, gated by the lawful-basis memo.
