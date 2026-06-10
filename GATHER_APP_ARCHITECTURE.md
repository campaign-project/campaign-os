# RFC-002 — Gather Field App Architecture

> The volunteer-facing mobile app that collects and validates petition signatures in the
> field. The human interface to the whole CampaignOS stack (BallotAccessDB + validation
> engine + optimizer + yield flywheel). Status: **design** — consolidates the decisions
> from the app/PWA/voice/verification discussions into a buildable plan.

## 0. Thesis

A volunteer opens the app and gets **one clear next move**; they collect signatures that
are **validated against the voter file at the moment of capture** — **offline**, because
field work has no signal; the app **enforces each state's rules by construction** so a
volunteer can't accidentally collect an invalid or non-compliant signature; and every
signature **feeds the yield intelligence** that routes the next volunteer better. The hard
part — *can a phone validate a signature against the voter file, offline, without holding
the file?* — is already answered (see §3). This RFC is how the rest assembles around it.

## 1. Scope

**In scope (v1):** the field client — routing, capture (digital + paper-assist), real-time
validation, offline sync, compliance guardrails, basic anti-fraud, gatherer progress/earnings.

**Out of scope (v1):** the organizer/campaign console (that's the web app, `site/console.html`
→ a real Next.js route); payments rails; full back-office. The app *produces* the data those
consume.

**Petition types:** independent-presidential + ballot initiatives (BallotAccessDB v1.1). The
app dispatches on `petitionType` × jurisdiction.

**Platform:** **React Native (Expo) — native from v1** (no PWA pilot; see §11 for why).

## 2. Core jobs (the volunteer's experience)

1. **Route** — "your highest-value move now" (optimizer): location/event, expected valid sigs, toward which state.
2. **Capture** — digital sign-on-glass where legal; **paper-assist** (the binding signature is wet ink) everywhere else (§5). Voice-accelerated metadata entry (§5.3).
3. **Validate** — every signature scored against the voter file at capture: 🟢 valid / 🟡 review / 🔴 won't count (§6).
4. **Comply** — residency, per-sig-pay legality, notary, single-subject, correct form — enforced from BallotAccessDB at the point of capture (§8).
5. **Sync** — capture + validate offline, queue, reconcile when back online (§4).
6. **Earn / progress** — civic score, drive progress, and pay-on-verify (valid sigs only, where legal).

## 3. The defining problem & its solution: offline real-time validation

You can't put a multi-GB voter file on a phone, can't require signal in a stadium, and can't
splatter voter PII across thousands of devices. **Routing dissolves all three:**

```
optimizer assigns volunteer → a geography (ZIPs / county)
        │
server builds a COMPACT INDEX of just that geography's voters
   (normalized name tokens + house number + status; KB–MB, encrypted)
        │
synced to the device → the SAME matcher (engine.core.js) runs LOCALLY, offline
        │
observations sync back → yield store → better routing
```

Because the assignment bounds the data to a few thousand records, the offline index is tiny,
the matcher is instant, and the device never holds the statewide file. **`engine.core.js`
(already written, already proven in-browser) is the on-device validation kernel — unchanged.**

## 4. Data & sync model

- **Device is a cache, never the source of truth.** The server owns signatures, observations,
  and the yield store. The device holds: the assigned per-geography voter index (derived,
  minimal-field, encrypted, TTL'd to the assignment) + a queue of captured signatures.
- **Sync:** push queued captures + observations; pull index updates + new assignments. Re-run
  server-side validation on sync (authoritative; the on-device verdict is a fast preview).
- **Cross-volunteer dedup happens server-side** at sync (the on-device matcher only dedups within
  its own batch). The yield store is the natural dedup point.
- **Durability (resolved by going native):** the PWA's iOS 7-day storage eviction + no-background-sync
  hazard is precisely why we skipped it; React Native gets persistent SQLite + Keychain/Keystore + real
  background sync, so the offline queue survives between shifts. Still treat the device as a cache (server
  is source of truth) and surface an explicit "N unsynced — connect to sync" state.

## 5. Capture modes

### 5.1 Dispatch on `captureMode` (from BallotAccessDB)
Verified reality: **51/51 independent-presidential jurisdictions require wet-ink paper** today.
So the default mode is **paper-assist**, not digital. The app reads `captureMode` per
jurisdiction and never offers a mode the law doesn't allow.

- **Paper-assist (default):** the binding artifact is the voter's wet-ink signature on the
  official sheet. The app *manages* it — validates the signer's name+address live, tracks
  which sheet/county, photographs/OCRs completed sheets, flags errors before mailing. Cuts the
  raw-to-valid loss *before* submission.
- **Digital (only where legal):** voter signs on glass; identity matched to the voter file;
  e-submit where allowed. Today: essentially nowhere for independent-presidential — so digital
  capture is gated behind BallotAccessDB and the modernization campaign (RFC-001 §9.6).

### 5.2 The bright line
Never present a digital signature as legally valid where wet ink is required. The app may
capture digitally *for verification/Moat-B* while submitting on paper — but the legal artifact
is the wet-ink sheet. Enforced in code, not policy.

### 5.3 Voice input (metadata, not signature)
Voice accelerates the **name+address lookup**, not the signature. Speak → on-device ASR →
**fuzzy-query the bounded local index** → "Did you mean *Maria Gonzalez, 5 Sunset Blvd*?" → tap
confirm. The index *rescues* imperfect ASR (it's a closed set to snap to). On-device + ephemeral
audio (privacy + offline). Best for door-to-door / booths / accessibility; weak in loud venues
(§6.2). Optional modality with typed/tap fallback; always confirm-before-count.

## 6. Voter verification

### 6.1 The mechanism — and why name+address is correct
The app matches the signer's **stated name + residential address** against the voter-file index:
normalize (nickname, street-type, typos) → block → Jaro-Winkler/address score → banded verdict.
This is **exactly the check the Secretary of State runs at submission** — so predicting validity
*is* running that match early. It confirms *a matching active registered voter exists in the
right jurisdiction*; it does **not** verify identity (petitions don't require ID by design).

- 🟢 MATCH (active, in-jurisdiction) → safe to submit.
- 🟡 REVIEW (gray-band, or registered-at-old-address) → never auto-rejected; prompt for the
  registration address or a second look.
- 🔴 NO_MATCH (not registered, or wrong jurisdiction) → won't count.

### 6.2 Events (e.g. stadiums): the out-of-jurisdiction filter
High footfall, but a large share are from the wrong county/state — invisible ineligibility that
only the voter-file match reveals. This is why events are high-raw / lower-valid (optimizer prices
event-blitz ~0.72). The real-time match converts "2,000 collected" into "1,300 that count, and we
didn't waste paper on the other 700." (Connectivity is worst here → §3 offline is mandatory.)

## 7. Circulator eligibility & the labor pool

Who can *collect* (the circulator) is distinct from — and usually looser than — who can *sign*.
In many states the strict registered-voter/resident rules bind the **signer**, while the
**circulator** can be a non-registered-voter, a non-resident, and sometimes a minor. This widens
the recruitable labor pool dramatically (students, travelers, non-registered supporters) — the
direct counter to the throughput problem that sinks volunteer drives.

**Verified (circulator-eligibility sweep, 51 jurisdictions, now a `circulator` dimension in
BallotAccessDB):** the collector almost never has to be a registered voter — **only New York
requires it (50/51 = no)**; a **minor can collect in ~21 states** (18+ required in 18; DC allows
17); U.S.-citizen required in only ~9; state-resident in only ~5 (NY/CT/NJ/MO/SD). Only the
**signer** must be a qualified local voter. The app enforces this per jurisdiction at onboarding
(gate who can be assigned where) — and it's a major recruiting unlock: students (incl. high-
schoolers in ~21 states), out-of-state supporters, non-citizens in much of the country.

## 8. Compliance & bright lines (enforced at capture)

The app consults BallotAccessDB per (jurisdiction × petitionType) and enforces, by construction:
- **Circulator eligibility** (§7) — who may be assigned where.
- **Per-signature-pay legality** — never pay per-sig where banned (criminal; invalidates the petition). Conservative default: don't pay where unconfirmed.
- **Notary/witness, single-subject, distribution, correct county form, deadline windows.**
- **Conservative fail-safe** — when a rule is `CONSERVATIVE-HOLD`, take the strictest reading; never risk the ballot line for throughput.

## 9. Anti-fraud & integrity

The trust story is the business (per-sig pay is only defensible if fraud is near-zero; cf. Michigan
2022). Signals: geostamp at capture, capture timing/anomaly detection, cross-volunteer dedup (§4),
and — native only — **device attestation** (App Attest / Play Integrity). Balanced against volunteer
privacy (no continuous surveillance; geostamp at the moment of capture only).

## 10. Security & PII

Voter-index + signer PII on volunteer devices is a legal constraint (voter-file use is political-
only; misuse is criminal). Requirements: encrypted at rest, **assignment-scoped** (only the routed
geography, minimal fields, derived index — never the full file), **TTL'd + wiped** after the
assignment, honoring each file's use restrictions. Native gets Keychain/Keystore/SecureEnclave;
PWA's IndexedDB is weaker (§11) — a key reason the paid/at-scale path graduates to native.

## 11. Tech-stack decision

**Decision: build React Native (Expo) directly — skip the PWA pilot.** Take on native setup
upfront to get hardware-backed PII, document scanning, background sync, device attestation, and
on-device speech from day one. The PWA-limit analysis below is retained as the *justification*
for going native and the checklist native must satisfy. Reasoning:

- **PWA pilot (not taken):** would have reused `gather.html` + `engine.core.js` in-browser for the
  fastest first slice — but its limits all bite on the paid/compliance/at-scale path we're heading
  straight for, so piloting around them isn't worth it.
- **PWA limits (now the native requirements to satisfy):** iOS 7-day storage eviction + no background sync
  (offline durability), no hardware-backed secure storage (PII), weak document-scan/OCR
  (paper-assist), no device attestation (fraud), install friction. These cluster on the **paid,
  compliance-critical, at-scale** path — i.e., they *define when to move to native*, not whether to start.
- **React Native over Flutter** for this codebase: the on-device validator is the legal bright
  line, and with RN it's the **same TS code** (`engine.core.js`) as the server — one source of
  truth, no client/server validator divergence. Flutter would require a Dart re-port kept in
  lockstep (a safety hazard, not just a maintenance cost). All-TS stack + PWA→RN continuity reinforce it.
  - **If Flutter** (e.g. team skill): keep the validator single-sourced via a **WASM core**, not a Dart re-port.
- **On-device ASR** (§5.3) is stronger on RN than PWA — another weight toward native at maturity.

## 12. Reuse — how it maps to what's built

| App need | Already built |
|---|---|
| On-device validation kernel | `engine.core.js` (browser-proven matcher) + `prototypes/validation-engine/` |
| Compliance brain (per-state rules) | **BallotAccessDB** (115 records, 5 petition types) |
| "Next best move" routing + data-bounding | `prototypes/optimizer/` (marginal value + multi-state) |
| Yield intelligence (sync target, compounding) | `prototypes/optimizer/yield.ts` + persistent store |
| Server-side per-geography index builder | the voter-file loader/adapters (`prototypes/validation-engine/load.ts` + `sources.ts`) |
| Field-screen UX prototype | `site/gather.html` (+ live capture) |

The app is an **assembly of proven parts behind a field UI**, not a from-scratch build.

## 13. Screen flow (volunteer)

`Onboard` (state, eligibility gate §7, training) → `Next Move` (optimizer card) → `Accept` (sync
the geography index) → `Capture` (signer name+address via type/voice → live verdict → wet-ink sign
the sheet / sign-on-glass where legal) → `Shift summary` (valid/review/invalid tally, safe-to-submit,
earnings where paid) → `Sync` (queue → server). Offline throughout; sync state always visible.

## 14. Staged delivery — React Native (Expo) is v1

- **v1.0 — Foundation + offline kernel (the first build):** extract the validator into a shared TS
  package (`packages/engine`) consumed by app *and* server — single source of truth (§11). Expo app
  with a synced per-geography index (SQLite), on-device validation, offline capture queue + visible
  sync state. Proves §3 natively.
- **v1.1 — Design-partner pilot:** capture-mode dispatch (paper-assist), compliance guardrails from
  BallotAccessDB, routing from the optimizer, observations → yield store; native camera + Keychain/
  Keystore secure storage. Run with a real initiative drive (e.g. a Rank-MI-Vote-type partner).
- **v1.2 — Scale + paid:** background sync, device attestation, document OCR, pay-on-verify, voice capture.

## 15. Open decisions

- Per-geography index format (encrypted SQLite vs. blocked JSON vs. bloom-filter prefilter + index).
- Paper-assist OCR approach (WASM Tesseract vs. native VisionKit/MLKit at Phase 2).
- Identity assurance beyond name+address (likely none — matches the legal standard; revisit only if paid-fraud risk demands).
- Where digital capture is unlocked first (tied to the modernization-campaign litigation targets in BallotAccessDB `captureMode`).
