# @campaign-os/engine

The **signature-validation engine** — the single source of truth for *"will this signature
count?"*, shared by the server and the React Native field app (RFC-002). Pure and
framework-agnostic (no platform deps), so the **same code** validates on-device (offline,
against the synced per-geography index) and server-side. This is *the* reason the field app is
React Native, not Flutter: one validator, never a client/server re-port.

## Public API

```ts
import { buildIndex, validateSigner, validateBatch, makeContext } from "@campaign-os/engine"

const index = buildIndex(votersForThisGeography)        // the synced per-geography slice
const ctx   = makeContext("Ohio", { voterFileTier })    // pure — caller supplies state context

// field app, per capture:
validateSigner({ id, name, address, signedOn }, index, ctx)
//   → { verdict: "VALID" | "INVALID" | "NEEDS_REVIEW", band, score, voter?, reasons }

// server, in bulk (with cross-batch dedup + yield slices + a "gather N more" projection):
validateBatch(signers, voters, { ctx, requiredValid })
```

Also exported: `matchSigner`, `verificationMode`, `evaluate`, `jaroWinkler`, `normName`/`normAddress`,
and the types (`VoterRecord`, `SignerInput`, `MatchResult`, `Verdict`, `StateContext`, `BatchReport`, …).

## Layers (`src/`)

`normalize` (nickname / USPS street-type / unit+ZIP) → `match` (blocking + Jaro-Winkler →
banded MATCH/REVIEW/NO_MATCH) → `rules` (per-state validity law + `verificationMode` dispatch:
voter-file-match / county-fan-out / residency-only) → `validate` (single + batch).

**The bright line:** NEEDS_REVIEW (gray band, or a non-standard mode) is never counted as
safe-to-submit. A false VALID risks the ballot line; a false REVIEW only costs a second look.

## Consuming it

Raw TS source, bundler-resolved (like the other workspace packages): add `@campaign-os/engine`
to the consuming app's `transpilePackages` (Next) / Metro config (Expo); the path is registered
in `tsconfig.base.json`.

## Verify

```bash
# type-check (Bundler resolution, strict) — no platform deps in the core:
node_modules/.bin/tsc --noEmit --strict --module esnext --moduleResolution bundler --target es2022 --lib es2022,dom packages/engine/src/index.ts

# behavioral selftest (emit CJS, run): 10/10 — reproduces the proven prototype verdicts via the public API
node_modules/.bin/tsc --module commonjs --moduleResolution node --target es2022 --skipLibCheck --rootDir packages/engine/src --outDir /tmp/engine-dist packages/engine/src/selftest.ts && node /tmp/engine-dist/selftest.js
```

Ported from `prototypes/validation-engine/` (proven 11/11 + browser-verified + folds into
BallotAccessDB); this package is the productionized, framework-agnostic home.
