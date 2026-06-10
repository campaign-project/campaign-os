# CampaignOS

**AI-native infrastructure for ballot access.** Getting a candidate or initiative onto the ballot means collecting tens of thousands of valid petition signatures by hand, against per-state rules that are arcane, conflicting, and unforgiving — one bad batch can cost the ballot line. CampaignOS turns that into software: a knowledge graph of every state's rules, a validation engine that runs the same matching logic on a phone offline and on the server, and a field app that tells a volunteer exactly where to stand and whether the signature they just took will count.

The flagship app is **Gather** (`apps/mobile`) — the volunteer signature-gathering field app. CampaignOS is the platform beneath it.

> **Private repository.** This codebase handles voter data and is not public. See [Voter data handling](#voter-data-handling) before adding anything that touches voter files.

---

## Monorepo layout

A single `pnpm` workspace (`pnpm@10.12.1`, `node-linker=hoisted`).

| Path | Package | What it is |
|------|---------|------------|
| `apps/mobile` | `@campaign-os/mobile` | **Gather** — the field app. Expo / React Native (SDK 53). Offline capture + queue, on-device validation, authenticated sync. |
| `apps/mobile/server/worker` | — | The production **sync backend**: a Cloudflare Worker + D1 + R2 + bearer auth. ([runbook](apps/mobile/server/worker/README.md)) |
| `apps/web` | `@campaign-os/web` | Next.js web surface. |
| `packages/engine` | `@campaign-os/engine` | **The validation engine — the moat.** Pure, framework-agnostic record-linkage matcher + per-state validity law. The *same* code runs on-device (offline) and server-side. |
| `packages/domain` | `@campaign-os/domain` | Shared domain model — product pillars, roadmap, policy sources. |
| `packages/api` | `@campaign-os/api` | tRPC API (context, routers, root). |
| `packages/db` | `@campaign-os/db` | Database schema + client (Drizzle; `db:generate` / `db:push`). |
| `packages/ai` | `@campaign-os/ai` | AI-provider abstraction (mock / OpenAI / OpenRouter / local). |
| `ballot-access-db` | — | The open knowledge graph of U.S. ballot-access rules — all 51 jurisdictions. |
| `ballot-access-data` | — | Verified per-state rule data consumed by the DB. |
| `prototypes/` | — | R&D: `validation-engine`, `optimizer`, `drive-sim`, `citation-grounding`. |
| `site/` | — | Standalone static landing + console demo. |

## Quickstart

```bash
corepack pnpm install          # install the whole workspace

# Web
corepack pnpm dev              # @campaign-os/web (Next.js)

# Gather (iOS simulator)
cd apps/mobile && corepack pnpm ios     # Expo dev server + simulator
```

Type-check the mobile app after TS changes:
```bash
cd apps/mobile && npx tsc --noEmit
```

## The validation engine

`@campaign-os/engine` is the heart of the system: given a signer's name + address, it decides whether that person is a registered voter whose signature will **count**.

- **Matcher** — record-linkage over a minimized voter index: Jaro-Winkler similarity with blocking, USPS Publication 28 address standardization applied to both sides before comparison.
- **Verdict bands** — `VALID` (≥ 0.88), `NEEDS_REVIEW` (≥ 0.70), `NO_MATCH`, with a per-state `verificationMode` governing how strict the law actually is.
- **Runs everywhere** — pure TypeScript, no framework or platform deps, so the device and the server reach the *same* verdict. The device version is bundled into Gather; the server version validates on sync.

## Sync backend

Gather works fully offline and syncs when it can. The backend is a hardened **Cloudflare Worker** (Workers + D1 + R2 + bearer-token auth):

- `POST /captures` — up-sync the pending queue; dedups across all volunteers.
- `GET /index/:id?since=V` — down-sync a campaign's voter index as a conditional **delta** (R2 version history); the device transfers only what changed.
- `GET /movement`, `GET /yield/:id` — the live collective rollup and validity-by-location.

Minimized, scoped index artifacts live in a **private** R2 bucket and are served only to authenticated device tokens. Full deploy + operator runbook: [`apps/mobile/server/worker/README.md`](apps/mobile/server/worker/README.md).

## Voter data handling

**Voter files are PII and their misuse is criminal in many states (e.g. CA Elec. Code §18109).** Non-negotiable rules for this repo:

1. **Never commit raw voter files or anything derived from them.** Raw files and built index artifacts (`voterfiles/`, `voterfiles/out/`, `ncvoter_*`, `*_Statewide.*`) are git-ignored and stay on the operator's machine. Only **minimized, scoped** index artifacts move to devices, over the authenticated sync channel.
2. **Use voter data only for the lawful, registered purpose** (election / petition activity) and honor each state's use restrictions.
3. **Never present a digital signature as legally valid where wet ink is required.** When a state's rule is ambiguous, take the strictest interpretation.
4. **Never risk the ballot line.** Submitting invalid signatures, or anything that could invalidate a filing, is the one outcome the entire system exists to prevent.

The committed `North_Carolina.*` fixtures are a 6-row **synthetic** sample and the public **rules** JSON — not voter records.
