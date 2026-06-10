# Validation Engine — prototype

> RFC-001 §5 validation layer · the efficiency lever that underbids petition firms
> and generates the proprietary signature-validity intelligence (Moat B).

Predicts whether a petition signature will **survive official review — _before_ you
submit it** — by matching each signer to the registered-voter file and applying that
state's validity law. The output is the count that is **safe to submit** (genuinely
valid), so a drive gathers far fewer raw signatures to clear the threshold instead of
over-collecting against an unknown ~80% validity rate.

```
node --experimental-strip-types engine.ts            # full demo (3 states)
node --experimental-strip-types engine.ts --selftest # matcher assertions, offline
```

Node ≥ 22.6, no install. Deterministic, **no network, no LLM** — the verdict is math
over records, which is what lets it gate a legal bright line without hallucinating a
"valid."

## Why this is the business, not a feature

Petition firms charge \$1–\$15+ per *valid* signature and eat the raw-to-valid loss
themselves. If you can predict validity at capture time you (a) gather less, (b) submit
clean, and (c) accumulate **validity-by-location × gatherer × format** data that nobody
else has and that compounds per signature. That data feeds the optimizer's yield priors
(RFC-001 §7.4) — the flywheel.

## Architecture (layers)

| File | Layer | Does |
|---|---|---|
| `normalize.ts` | canonicalize | Fold cosmetic differences: nickname (Bob→Robert), `Last, First`, USPS street-type (Street→St), directionals, unit/ZIP parse. |
| `match.ts` | record linkage | **Blocking** (zip5 + last-name prefix) → **scoring** (Jaro-Winkler name, house-number-dominant address). Returns a *banded* verdict: `MATCH` / `REVIEW` / `NO_MATCH`. |
| `rules.ts` | validity law | Per-state `verificationMode` dispatch + the legal conditions (active elector, registered-before-signing, in-district, duplicates). Where the **bright line** lives. |
| `validate.ts` | orchestrate | Batch match → dedup across the batch → aggregate. Emits safe-to-submit count, Moat-B slices, and a "gather N more" projection. |
| `fixtures.ts` | demo data | **Synthetic** voters + a signer batch stuffed with every failure mode. No real PII, ever. |
| `engine.ts` | demo + selftest | House-style report; offline matcher assertions. |
| `load.ts` | **real-file loader** | Spec-driven parser: encoding-aware decode, quoted-field split, header-or-positional column resolution, status/date normalization → canonical `VoterRecord`. Both a batch `loadVoterFile` and a `streamVoterFile` async generator. |
| `sources.ts` | **adapter registry** | One `AdapterSpec` per state (the real, cited layout). Adding a state = adding an entry, not code. |
| `samples.ts` | format round-trip | Serializes synthetic people INTO each state's real on-disk format (proves the adapter with no PII). |
| `loaddemo.ts` | loader demo + checks | `node --experimental-strip-types loaddemo.ts` |
| `streamdemo.ts` | streaming proof | `node --experimental-strip-types streamdemo.ts` |
| `freshness.ts` | staleness report | `node --experimental-strip-types freshness.ts` — flags records past their re-check window |

## Streaming the big files

The real statewide files are large (NC ≈ 516MB) and we never want one in memory at
once. `streamVoterFile(path, spec)` is an **async generator** yielding one canonical
record at a time — peak memory is a read-chunk + one partial line, independent of file
size. Identical row-mapping to the batch loader, so output matches byte-for-byte.

Two chunk-boundary hazards are handled: a **line split across chunks** (held-over
`remainder` prepended to the next chunk) and a **multi-byte UTF-8 char split across
chunks** (a persistent `TextDecoder` with `{stream:true}` buffers the partial sequence).
`streamdemo.ts` proves both by streaming with an **8-byte** read buffer and asserting
the result equals the batch loader — including Ohio's UTF-8 `ñ` reassembled across a
boundary.

Because it's a generator, the caller chooses what to keep. `collectVoterFile(path,
spec, { filter, limit })` loads only the records you need — e.g. just the ZIPs where
signatures were gathered — so memory stays bounded even on a 516MB file. (Demo:
stream + count 20,000 rows without an array; filter to one ZIP; honor an early limit.)

## Real-data loader (7 free-access states)

`loaddemo.ts` proves the loader against the **real layouts** of the 7 free states
(NC/OH/MS/FL/OK/VT/WA), pulled from each state's official data dictionary. Those 7
formats are wildly different — and that difference *is* the moat:

| State | Delimiter | Encoding | Layout | Status codes | Date |
|---|---|---|---|---|---|
| North Carolina | tab | windows-1252 | header, combined addr | A / I·R·D·S | MM/DD/YYYY |
| Ohio | comma | utf-8 | header, addr+unit | ACTIVE / … | MM/DD/YYYY |
| Mississippi | comma | utf-8 | header ⚠ | active / inactive | unknown |
| Florida | tab | ascii | **positional (no header)** | ACT / INA | MM/DD/YYYY |
| Oklahoma | comma | utf-8 | header, split addr | A / I | MM/DD/YYYY |
| Vermont | pipe | windows-1252 | header, 2-line addr | ACTIVE / … | MM/DD/YYYY |
| Washington | pipe | windows-1252 | header, split addr | Active / … | YYYY-MM-DD |

Four delimiters, three encodings, header-vs-positional, two name/address layouts, five
status vocabularies. One generic parser + seven specs handles all of them →
`VoterRecord`. Florida is the trap: a header-name adapter would silently misread a
header-less positional file, so the spec marks it positional and resolves by 1-based
index. The demo writes a synthetic sample in each real format, loads it back, asserts
the canonical invariants (incl. that `ñ` survives the Windows-1252 decode and that
Mississippi's unknown date format correctly yields a blank `registeredOn`), then runs
the full engine end-to-end on the loaded Washington file.

**When the team downloads a real file via the mapped URL, the same adapter parses it
unchanged** — we just never commit the PII. `sources.ts` carries each state's
`downloadUrl` + `layoutDocUrl`. Caveats are preserved in each spec's `notes` (e.g. MS's
last-name column header is unconfirmed → `confidence: low`).

## The banded verdict & the bright line

The matcher never returns a naked boolean. The middle **`REVIEW`** band (score
0.70–0.88) is deliberate: a plausible-but-uncertain identity. Validity then resolves to
one of:

- 🟢 **VALID** — confident match to an active elector, all legal conditions met. *Only
  these count toward "safe to submit."*
- 🔴 **INVALID** — not in the file, inactive/cancelled, registered after signing, or a
  duplicate. Don't submit.
- 🟡 **NEEDS_REVIEW** — gray-band match, or a non-standard state mode. **Never counted as
  valid.** A false VALID risks the ballot line; a false REVIEW only costs a second look —
  we always err to the cheap mistake (RFC-001 §5.5 conservative fail-safe).

## Per-state `verificationMode` (from the voter-file map)

Not every state is "match against the statewide file." The map
(`VOTER_FILE_ACQUISITION.md`) surfaced three modes the engine dispatches on:

- **`voter-file-match`** — the normal case (most states).
- **`county-fan-out`** — no single statewide file; assembled per county (NJ, HI, AR, MA,
  IN). If the signer's county file isn't loaded → `NEEDS_REVIEW`, not a false INVALID.
- **`residency-only`** — North Dakota has **no voter registration at all**; there's
  nothing to match against, so validity rests on the filing officer confirming residency.
  Software can only surface the attestation → `NEEDS_REVIEW`.

## Demo output, in one line

The fixture batch (intentionally ~42% valid to exercise every path; real drives ~80%)
correctly catches nickname/typo matches as VALID; inactive/cancelled/duplicate/
registered-after/unregistered as INVALID; a same-household wrong-first-name as REVIEW;
and prints validity by gatherer (Ava 75% > Ben 50% > Cara 0%) plus a projection to the
threshold. North Dakota and New Jersey demonstrate the two exception modes.

## What v1 is NOT (next steps)

- **No signature-image / handwriting check** — out of scope for software; that's the
  one thing only a human/forensic step does. The engine verifies *identity + eligibility*,
  which is the bulk of real-world rejections.
- **Priors, not measured rates** — the 80% fallback and 1.25× buffer are RFC-001 priors
  until the Moat-B loop replaces them with observed per-location/gatherer rates.
- **The other 44 states** — each is another `AdapterSpec` entry in `sources.ts` (same
  research → spec pattern). The 7 free states are done; restricted states gate on the
  acquisition/compliance workflow, not the parser.
- **Confirm the low-confidence specs** — Mississippi's last-name column header is a
  best-guess (`confidence: low`); verify against a real file header before relying on it.
  (`freshness.ts` already flags MS on every run regardless of date.)

## Freshness (`verifiedAsOf` + `freshness.ts`)

Fee/access/layout data drifts (AL HB67 cut its statewide fee ~\$38k→\$1k on 2026-06-01;
FL's layout was revised 2026-05-04), so a snapshot without an expiry date silently rots.
Every voter-file record (`voterFile.verifiedAsOf` in the master) and every `AdapterSpec`
(`verifiedAsOf`, plus the upstream `layoutRevision` where stated) carries the date we last
confirmed it. `freshness.ts` turns that into an action — two cadences (acquisition data
re-checked every 180d, layouts every 365d), flags anything past due or due-soon (and
low-confidence specs regardless), and **exits non-zero if anything is stale** (CI-friendly):

```
node --experimental-strip-types freshness.ts [--today=YYYY-MM-DD] [--voterDays=180] [--layoutDays=365]
```
