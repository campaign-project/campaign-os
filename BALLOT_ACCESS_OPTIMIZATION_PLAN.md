# Ballot Access Signature Optimization — Deep Plan

**RFC-001 · category: `compliance` + `ai` + `mobile` + `integrations` · status: draft**

> Make volunteer-driven ballot-access signature gathering the most time-efficient
> in the world: every volunteer, given their location and the next two hours of their
> life, is pointed at the single highest-yield thing they can do to get the candidate
> on the ballot — with digital, cell-phone signature capture wherever the law allows it.

---

## 1. Problem Statement

For a presidential campaign, ballot access is the hardest pure-logistics problem on the
calendar. A major-party nominee inherits ballot lines; an independent or new-party
presidential candidate must petition onto the ballot in **51 jurisdictions** (50 states +
D.C., plus territories for primaries), each with its own:

- signature threshold (from a few thousand to **tens of thousands** — e.g. ~83,000 in a single
  large state at 1.5% of the last gubernatorial vote),
- filing deadline (spread across roughly March–August of the election year),
- distribution rule (some require N signatures per congressional district),
- circulator eligibility rule (age, residency, registered-voter status, party status),
- petition form, witness/affidavit, and notarization requirements,
- and signature-validation regime (signatures checked against the voter file; **invalid rates
  of 20–40% are normal**, so drives must over-collect by a large buffer).

The nationwide total for an independent presidential run lands in the **600,000–900,000+
raw signature** range once buffers are included. Campaigns historically solve this with
**paid signature firms at $1–$10+ per valid signature** — millions of dollars — or with
volunteer drives that are poorly targeted and waste enormous amounts of volunteer time on
low-yield corners, on signatures that get invalidated, or on jurisdictions that are already
safe while behind-pace jurisdictions miss deadlines.

**The scarce resource is the volunteer-hour.** This plan treats it as such.

### Sources grounding this plan

- Ballotpedia — *Methods for signing candidate nominating petitions* (electronic-signature jurisdictions).
- Ballotpedia — *Filing deadlines for independent presidential candidates, 2024*.
- NASS — *Summary: State Laws Regarding Presidential Ballot Access* (July 2024).
- NCSL — *Circulators of Initiatives*; Colorado SOS *Petition Circulation Reference Manual* (affidavit/notarization, rejection).
- Arizona SOS *E-Qual* and *Local E-Qual Candidate Guide* (online signature collection).

> Every fact above is exactly the kind of thing the per-state research subagents (§6) keep
> current, cite to a primary source, and route through human legal review before it is allowed
> to influence a single volunteer's assignment.

---

## 2. Goals and Non-Goals

### Goals

1. **Maximize valid signatures per volunteer-hour**, weighted by each jurisdiction's *marginal*
   need (deadline risk × remaining deficit), not raw signature count.
2. Give every volunteer a **"best use of your next N hours, right now, near you"** recommendation:
   a specific place or event, a route, a script, the eligibility rules, and the capture mode.
3. **Capture digital, cell-phone signatures everywhere** — in every jurisdiction — with real-time
   voter-file verification and register-then-sign. Submit them in whatever form each state's law
   requires (digital where accepted; convert to compliant wet-ink everywhere else, §9.5).
4. **Build a modernization movement.** Turn the verified-but-uncounted digital signatures from
   paper-only states into the evidentiary record for litigation, Secretary-of-State pilot advocacy,
   and a public "modernize ballot access" campaign (§9.6).
5. Maintain a **per-state rules intelligence system** (one research subagent per jurisdiction)
   that keeps the legal requirements accurate, cited, versioned, and automatically verified (§5.5).
6. Hit every jurisdiction's deadline with the **minimum total volunteer effort** and a safe buffer —
   **never putting the candidate's ballot line at risk** for the sake of the reform experiment.

### Non-Goals (for the first release)

- Replacing legal counsel. The system tracks and warns; a human attorney verifies rules.
- Paid circulator management / signature-firm procurement (later; volunteers first).
- Initiative/referendum petitions (different regime; the architecture generalizes, but scope is
  candidate/presidential ballot access first).
- Treating any rule as legal certainty on AI judgment alone — rules go live only after passing §5.5
  automated verification, and default to the strictest interpretation while uncertain.

---

## 3. Core Thesis & Objective Function

We optimize a single quantity:

```text
maximize   Σ  (expected valid signatures a volunteer produces toward jurisdiction j)
          v,o  × MarginalValue(j)
        − TravelCost(v → o) − SetupCost(o) − RiskPenalty(o)

subject to:  circulator eligibility(v, j) is satisfied
             solicitation is legal at o (permit / public-forum / venue consent)
             volunteer availability, training/certification, and safety constraints
             each jurisdiction collects ≥ goal × (1 + buffer) by its deadline
```

Where:

- **MarginalValue(j)** is the shadow price of a valid signature in jurisdiction `j` (and district,
  where distribution rules apply). It is **high** when `j` is behind the pace required to hit its
  deadline, and **zero** once `j` has reached `goal × (1 + buffer)`. This is what stops volunteers
  from piling signatures onto a state that is already safe while another state quietly misses.
- **Expected valid signatures** explicitly models the **validity/rejection rate** of the capture
  mode and jurisdiction — a digital signature verified against the voter file in real time is
  worth far more than a paper signature with a ~30% chance of rejection.

Everything else in this document is machinery to estimate the terms of this function and act on it.

---

## 4. The Three Engines (overview)

```text
        ┌───────────────────────────────────────────────────────────┐
        │  A. PER-STATE RULES INTELLIGENCE  (one subagent / state)    │
        │  → StateBallotRule: threshold, deadline, distribution,      │
        │    circulator eligibility, capture mode, validation rules   │
        │    — cited, versioned, auto-verified + fail-safe (§5.5)     │
        └───────────────┬───────────────────────────────────────────┘
                        │ feeds constraints + marginal-value model
                        ▼
        ┌───────────────────────────────────────────────────────────┐
        │  B. OPPORTUNITY & YIELD MODEL                               │
        │  locations + events → expected valid signatures / hour,     │
        │  eligibility density, legal-to-solicit, daypart, weather    │
        └───────────────┬───────────────────────────────────────────┘
                        │ candidate opportunities + yields
                        ▼
        ┌───────────────────────────────────────────────────────────┐
        │  C. OPTIMIZATION & ASSIGNMENT ENGINE                        │
        │  marginal-value LP (deadline shadow prices) +               │
        │  volunteer→opportunity matching − travel − risk             │
        └───────────────┬───────────────────────────────────────────┘
                        │ "best use of your next 2 hours"
                        ▼
        ┌───────────────────────────────────────────────────────────┐
        │  D. VOLUNTEER CAPTURE EXPERIENCE (PWA, digital-first)       │
        │  remote-online · in-person digitized · optimized paper      │
        └───────────────────────────────────────────────────────────┘
```

---

## 5. Engine A — Per-State Rules Subagents

The single most dangerous failure mode is a **wrong rule**: collect with an ineligible circulator,
miss a distribution requirement, or use a digital signature where it is not accepted, and an entire
jurisdiction's petition can be invalidated — knocking the candidate off that state's ballot. So the
rules layer is treated as a first-class research operation with layered automated verification (§5.5)
and a conservative fail-safe — because there is no counsel to catch mistakes downstream.

### 5.1 One subagent per jurisdiction

A **`StateRuleAgent`** is instantiated per jurisdiction (50 states + D.C. + territories). Each is an
AI research agent built on the existing CampaignOS AI provider abstraction + approved-source RAG +
citation validation. Its job:

1. **Retrieve** primary sources: the Secretary of State / state board of elections pages, the state
   election code, official candidate ballot-access guides, and the relevant court decisions.
2. **Extract** a structured `StateBallotRule` record (schema below), with **every field citing a
   source URL, the quoted text, an effective date, and a retrieval timestamp.**
3. **Classify the capture mode** the state allows (remote-online / in-person-digitized / paper).
4. **Emit confidence + conflicts.** When sources disagree or are stale, it flags rather than guesses.
5. **Verify automatically — there is no counsel gate.** A resource-constrained campaign will not have
   an attorney to sign off on 51 jurisdictions. So a rule goes live only through the layered automated
   verification + conservative fail-safe in **§5.5** — multi-agent consensus, adversarial refutation,
   citation grounding, recomputation, and tiered confidence — and falls back to the strictest
   interpretation whenever uncertain.
6. **Watch for change.** Re-runs on a schedule and on trigger (legislative session ends, litigation
   filed, SOS guide updated). A diff that changes a threshold or deadline re-opens review and alerts
   the ballot-access director.

### 5.2 `StateBallotRule` schema (the contract every subagent fills)

| Field | Example | Notes |
|---|---|---|
| `jurisdiction` | `AZ` | state / DC / territory |
| `accessPath` | `independent_petition` | major-party / new-party / independent / write-in |
| `signaturesRequired` | `43,000` | the legal minimum |
| `signatureBasis` | `1.5% of last gov vote` | how the number is derived (recompute each cycle) |
| `recommendedBuffer` | `1.8×` | from modeled rejection rate (§9) **and the validation model** — e.g. CA's random-sample escalates to a full count if the estimate lands in the 90–110% band, so the real target is *comfortably above 110%*, not 100%+ |
| `deadline` | `2028-08-?? 17:00 MST` | hard filing deadline |
| `distributionRule` | `none` \| `≥N per CD` | drives **district-level** marginal value (CO requires ≥1,500 per congressional district — you can be "done" statewide and still fail) |
| `presidentialElectorsRequired` | `11` (AZ) / `54` (CA) | slate size = the state's electoral votes; each elector files paperwork |
| `filingGatesBeyondSignatures[]` | `[VP consent, electors' nomination papers, acceptance letters, audio-recording rule]` | **non-signature knockouts** — a 2024 AZ candidate was disqualified for missing electors' paperwork, *not* signatures. Tracked as hard gates with their own deadlines |
| `circulatorEligibility` | `18+, registered AZ voter` | enforced at assignment time |
| `residencyRequired` | `true/false` | note: several struck down on 1st-Am grounds — cite the controlling case |
| `witnessOrNotary` | `none` \| `circulator certification` \| `notarized affidavit per section` | a **field-logistics input**: CO requires per-section notarization (the most common knockout, and a notary must be routed into the signing flow); AZ needs only a circulator certification; CA is ambiguous (statute shows a notary form, practice often a perjury declaration) |
| `validationModel` | `random_sample_escalating` \| `voter_file_match` \| `full_count` | how signatures are checked — drives `recommendedBuffer` |
| `oneCountyPerSheet` | `true/false` | affects paper packet design |
| `captureMode` | `paper` \| `remote_online` \| `in_person_digitized` \| `hybrid` | see §11 |
| `digitalSystem` | `E-Qual` / `eSign` / `null` | official system name + URL |
| `digitalScope` | `nomination only` / `includes independent` | **critical** — most digital is nomination-petition only |
| `validationMethod` | `voter-file match + signature compare` | informs validity model |
| `feeAlternative` | `$X filing fee in lieu` | sometimes cheaper than signatures |
| `sources[]` | `{url, quote, effectiveDate, retrievedAt}` | required, ≥1 primary per field |
| `verificationStatus` | `draft` / `auto-live` / `conservative-hold` / `blocked` / `deprecated` | machine-gated, tiered (§5.5) — not a binary human "verified" |
| `machineConfidence` | `0.0–1.0` + signals | consensus, citation-grounding, recompute-match, recency |
| `conservativeFallback` | the strictest interpretation to use while uncertain | what the optimizer relies on until a field reaches `auto-live` |
| `verifiedBy`, `verifiedAt` | `machine-consensus` / `sos-inquiry` / `case-law` (+ optional human) | audit; an SOS written answer is the authority of last resort |

### 5.3 Grounded reality the agents encode today

The capture-mode field is not aspirational — it reflects current law. As of 2025, electronic signing
exists in only a handful of jurisdictions, in two flavors:

- **Remote online** (voter self-signs from anywhere): **Arizona E-Qual**, **New Mexico** — but the
  statutes are written for *candidate nomination* petitions (e.g. US Senate/House), so `digitalScope`
  usually excludes independent presidential. The agent must read the scope precisely.
- **In-person digitized** (circulator's device, voter signs on screen, real-time voter-file check;
  can register/update then sign): **Denver, CO eSign**, **Washington, D.C. eSign** (D.C. additionally
  requires the signed petition be **printed** and submitted — a hybrid).
- **Everywhere else:** wet-ink paper.

The subagents keep this map honest per cycle. The optimizer never assumes digital; it asks the
verified rule.

### 5.4 Validated against real jurisdictions (AZ · CA · CO)

This is not theoretical. The `StateRuleAgent` has been run against three contrasting jurisdictions;
the cited, structured output (DRAFT, pending counsel) is in
[`BALLOT_ACCESS_STATE_RULES_SAMPLE.md`](./BALLOT_ACCESS_STATE_RULES_SAMPLE.md). Running it surfaced
schema gaps now folded in above — `presidentialElectorsRequired`, `filingGatesBeyondSignatures[]`,
district-level `distributionRule`, and validation-model-driven `recommendedBuffer` — plus a sharp
reminder that **secondary sources are dangerously stale** (Colorado's real requirement is 12,000
across 8 districts, while NASS/Ballotpedia/an old SOS page still show a flat 5,000). That gap is the
entire case for primary-source-first research + automated verification (§5.5) + per-cycle re-runs.

A second, adversarial pass (the `StateRuleValidationAgent`, §5.5) was then run against all three
DRAFTs — independently, without the first agent's sources. It debunked the stale Colorado 5,000 by
tracing it to its origin statute, recomputed California's 219,403 from the underlying registration
total, resolved California's circulator/notary conflicts to the controlling statute, and caught that
Arizona's official SOS handbook *itself* misstates the signature basis and that the draft's
"one-county-per-sheet" claim has no statutory support. Results are in the sample file. This is the
evidence that automated verification catches real errors — including a wrong primary source.

### 5.5 Verification without human counsel

This is a hard constraint: the campaign will not have an attorney to sign off on 51 jurisdictions, so
**automated verification is the primary line of defense** — and it must be honest about its limits.

**What it CAN do (demonstrated above):** multi-agent consensus, adversarial refutation, primary-source
anchoring, citation grounding, and recomputation already caught a *primary source that was itself
wrong* (AZ handbook), a *draft hallucination* (AZ "one-county-per-sheet"), a *stale figure* (CO 5,000,
traced to its origin), and reproduced a computed threshold arithmetically (CA 219,403). That is
stronger than a human skim of a Secretary-of-State website.

**What it CANNOT fully do:** some questions are legal *interpretation*, not fact lookup — "does a
penalty-of-perjury declaration satisfy California's sworn-affidavit requirement?"; "does a Saturday
filing deadline roll to Monday?" Retrieval cannot settle these; they need an authority.

**So the human-counsel gate is replaced by a layered automated gate + a conservative fail-safe + a
free authority of last resort:**

1. **Multi-researcher consensus (N ≥ 3 independent agents).** A field is machine-verifiable only when
   independent agents, using *different* search strategies, converge on the same value from primary
   sources. Divergence is a flag, not an average.
2. **Adversarial reviewer** (demonstrated): a separate, default-skeptical agent that tries to *refute*
   each field and must re-find the fact itself, withheld from the first agent's sources.
3. **Citation grounding (deterministic, no LLM judgment).** Every cited URL is fetched and the quoted
   text is confirmed to appear *verbatim* at the source (normalization-robust; semantic *support* is
   layers 1–2's job, not this one) — fabricated, altered, or dead-link citations die mechanically.
   **Prototyped and working:** [`prototypes/citation-grounding/`](./prototypes/citation-grounding/)
   passes its offline matcher self-test (5/5) and, on real AZ/CA/CO citations, grounds 5 and catches a
   planted fabricated quote → `GATE: FAIL`. The fetcher escalates Node → **wick** (browser-grade) →
   **pdftotext**, so it grounds the `219,403` figure directly against the *primary California SOS PDF*;
   CAPTCHA-walled / dead-host sources stay `UNREACHABLE` by design (no false verdicts).
4. **Recomputation.** Any value derived by formula (3% of non-party registrants; 1% of registration;
   1,500 × CD count) is recomputed from the official underlying data; a match is high-confidence.
5. **Recency / staleness + conflict detection.** Prefer the most-current primary source; compare
   effective / "current-through" dates; explicitly detect source-vs-source conflict and resolve toward
   the controlling authority (statute > official SOS page > secondary).
6. **Machine-confidence score + tiered gating** (replaces the binary "verified"):
   - **AUTO-LIVE** — primary-sourced + consensus + citation-grounded + recompute-matches → the
     optimizer may rely on it.
   - **CONSERVATIVE-HOLD** — any conflict, single-source value, or interpretation question → the
     optimizer uses the **strictest** interpretation and the field is loudly flagged.
   - **BLOCKED** — source unreachable or genuinely unresolved → the optimizer must not rely on it.
7. **Conservative-by-default fail-safe (the single most important rule with no lawyer).** When
   uncertain, assume the interpretation that makes you *over-comply*: higher signature count, stricter
   circulator rule, earlier deadline, notarization required, digital not allowed. **Uncertainty must
   cost extra volunteer effort — never ballot access.** Erring strict over-collects; erring loose
   loses the ballot.
8. **Authority of last resort (the free substitute for counsel).** For genuine interpretation
   questions, go to the body that actually decides — the state election office. The system **drafts the
   exact written inquiry** to the SOS/board, surfaces any controlling case law / AG opinion / SOS FAQ
   it finds, and logs the official's written answer as `verifiedBy: sos-inquiry`. Election officials
   answer these for free; pro-bono election-law clinics and ballot-access nonprofits are secondary
   channels. This is how a no-budget campaign gets authoritative answers without a retainer.

**Prototype status (end-to-end, real agents):** the full stack — grounding short-circuit → consensus/
adversarial judge → tiered gate → conservative fail-safe — is implemented and runnable in
[`prototypes/citation-grounding/pipeline.ts`](./prototypes/citation-grounding/). It was run on a CA
draft with the **real** judge (four independent agents, one per grounding survivor, each doing fresh
primary-source re-derivation + adversarial refutation), producing a machine-verified rule with **no
human counsel**: 🟢 3 AUTO-LIVE (incl. `219,403` grounded against the SoS PDF; the judge *resolved* the
circulator SoS-guide conflict to controlling statute), 🟡 1 CONSERVATIVE-HOLD (`witnessOrNotary` — real
CCP §2015.5 question → "assume notarization required" + an **auto-drafted SoS inquiry**), 🔴 1 BLOCKED
(fabricated quote, LLM judging skipped). Output + escalation in
[`VERIFIED_RULE_CA.md`](./prototypes/citation-grounding/VERIFIED_RULE_CA.md).

**Honest bottom line:** automated verification + conservative fail-safe + going straight to the
election authority gets a resource-constrained campaign most of the way *safely*, because residual
uncertainty is engineered to degrade into over-compliance and explicit flags — never silent confident
error. The system must never mark a rule trustworthy on AI judgment alone and let a volunteer rely on
it as legal certainty.

---

## 6. Data Model

New entities (attach to the existing tenant `campaignId`, audit, and consent spine):

- `BallotAccessTarget` — one per jurisdiction: goal, buffer, deadline, progress, risk status.
- `StateBallotRule` — §5.2, versioned, auto-verified with tiered confidence (§5.5).
- `Opportunity` — a place + time window where signatures can be gathered (location or event-derived).
- `Event` — ingested external event (festival, game, market, campaign event) → spawns `Opportunity`.
- `SolicitationZone` — legal-to-solicit geometry + permit status for a location/venue.
- `YieldObservation` — actual outcomes (approaches, consents, captured, later validated) per shift,
  used to train the yield model.
- `Assignment` — volunteer → opportunity, with route, mode, script, eligibility check, time window.
- `SignaturePacket` — paper packet (county, sheet ids, chain-of-custody log) **or** digital batch.
- `Signature` — signer record (PII-minimized), capture mode, geostamp, timestamp, dedupe key,
  `submissionForm` (digital / converted-wet-ink), `countsLegally` (bool, per jurisdiction).
- `SignatureValidation` — match result against voter file, status, rejection reason.
- `ModernizationLedgerEntry` — verified digital signature recorded in a paper-only state for the
  reform movement: voter-file-verified, cryptographically timestamped, consented-for-advocacy,
  linked to jurisdiction and (where also obtained) its compliant wet-ink counterpart.
- `CirculatorCertification` — per-volunteer, per-jurisdiction eligibility + training status.

---

## 7. Engine B — Opportunity & Yield Model

### 7.1 What makes a spot good

Expected **valid** signatures per hour at an opportunity `o` for volunteer `v`:

```text
E_valid(o, v) = footfall(o, daypart, weather)
              × approachRate(v)                     # volunteer skill/throughput
              × consentRate(o)                       # willingness in this context
              × eligibleFraction(o, jurisdiction)    # registered (or registerable) voters of j
              × hours
              × validityRate(captureMode, jurisdiction)
```

- **footfall** — modeled per location type and daypart: transit hubs and DMV/MVD lines, university
  campuses between classes, farmers' markets and festivals on weekends, libraries, post offices,
  stadium gates pre/post event, busy retail corridors. Starts from priors, learned from
  `YieldObservation`.
- **eligibleFraction** — the fraction of the crowd who are registered voters **of the petition's
  jurisdiction**. For a statewide presidential petition this is high for any in-state crowd, but
  drops at airports, interstate borders, and tourist destinations. For **distribution-rule** states
  it must be the right *congressional district*.
- **register-then-sign uplift** — in digital jurisdictions that allow in-app registration
  (Denver/DC/AZ pattern), `eligibleFraction` effectively includes *registerable* people, not just the
  already-registered. This is a major yield multiplier and a reason to prioritize digital spots.
- **validityRate** — near **1.0** for digital with real-time voter-file verification; materially lower
  (and modeled per jurisdiction) for paper.

### 7.2 Events as first-class opportunities

Events are the highest-yield opportunities because they concentrate eligible voters. The system:

1. **Ingests events** from: the campaign's own `Event` calendar, public/civic calendars, venue and
   ticketing feeds, university and municipal calendars, and farmers'-market / festival directories.
2. **Estimates crowd size and eligibility density** (local festival ≫ national touring act for
   in-state fraction).
3. **Resolves legal-to-solicit** via `SolicitationZone`: public sidewalks and traditional public
   forums are strongly protected; private venues and many event grounds prohibit solicitation and
   require permission. The optimizer will not send a volunteer somewhere they'd be ejected or cited.
4. **Spawns time-boxed `Opportunity` records** (gates open, intermission, close) with a yield estimate.

### 7.3 Learning the yields

Cold start from **priors** (location-type × daypart tables seeded from domain data). As
`YieldObservation`s arrive, update per-opportunity-type estimates with a **contextual bandit /
Bayesian update** so the system explores new spots but exploits known winners. Features: location
type, daypart, day-of-week, weather, event presence/size, recent saturation (diminishing returns if
a corner was just worked), historical consent and validity.

### 7.4 Cold-start yield priors (seed values)

Until `YieldObservation`s accumulate, the model seeds from these. **Productivity figures are
experience-based industry rules-of-thumb** — per-circulator output is not cleanly published (firms
treat it as proprietary and recruit on per-day output); **validity and cost figures are sourced.**

Productivity — RAW signatures, before validation (signatures/hour × ~4–6 productive hours/day):

| circulator × location | sigs/hour | ~per day |
|---|---|---|
| casual volunteer · ordinary spot · part-day | 3–8 | 15–40 |
| trained volunteer · good spot · full day | 8–15 | 50–100 |
| experienced paid circulator · high-traffic | 15–30 | 100–200+ |
| event blitz (festival / transit / stadium gate) | 30–50+ | several hundred (short windows) |

Validity — seeds `validityRate` and `recommendedBuffer`:

- **~80% of submitted signatures are valid on average** for petition drives (Ballotpedia, *Initiative
  petition signature validity rates*) — ~20% baseline rejection; sloppier drives / stricter states run
  20–40% rejected. Seed **paper `validityRate` ≈ 0.65–0.80**; **digital with real-time voter-file
  verification ≈ 0.98–1.0** (rejection is caught at capture, not after submission).
- Buffer: generic seed **1.4–2×**, pushed higher where the validation model bites — e.g. CA's
  random-sample→full-count band means target comfortably **above 110%** (§5.2).

Cost benchmark (sanity-check, not a model input): Ballotpedia tracks **cost-per-required-signature
(CPRS)** by firm/state; the all-in cost to qualify a citizen initiative **nearly doubled from 2020 to
2022** (Marketplace, 2022), with paid CPRS commonly low-single to low-double-digit dollars per
*required* signature (higher near deadlines / in hard states). Every valid **volunteer** signature is
that much paid-market cost avoided — the metric the optimizer is implicitly maximizing.

> These are priors only. The `YieldObservation` loop (§7.3) replaces them with *measured*
> signatures/hour and validity by (location-type × daypart × jurisdiction × capture-mode) as real
> shifts report in — so the estimates become sharper and campaign-specific over time.

---

## 8. Engine C — Optimization & Assignment

### 8.1 Marginal value via a deadline-risk shadow price

Run a lightweight **coverage model** per jurisdiction (and district):

```text
requiredRate(j)  = remainingValidNeeded(j) / timeToDeadline(j)
actualRate(j)    = trailing valid signatures/day toward j
risk(j)          = requiredRate(j) / max(actualRate(j), ε)

MarginalValue(j) = 0                       if progress(j) ≥ goal(j) × (1 + buffer)
                 = f(risk(j))              otherwise, monotonically increasing in risk
```

`MarginalValue` is exactly the LP dual / shadow price of each jurisdiction's coverage constraint:
how much one more valid signature there reduces the chance of missing the deadline. Behind-pace,
near-deadline jurisdictions dominate; safe jurisdictions fall to zero.

### 8.2 Assignment

Given current opportunities, available volunteers, and marginal values, solve a
**generalized assignment / matching** problem maximizing total expected marginal valid yield minus
travel and risk:

```text
score(v, o) = Σ_j  E_valid(o, v) toward j  × MarginalValue(j)
            − travelCost(v → o) − setupCost(o) − riskPenalty(o)
```

Hard constraints: circulator eligibility for the jurisdiction, solicitation legality, volunteer
availability/training/safety, opportunity capacity, deadline feasibility. Solve greedily for
real-time single-volunteer recommendations; solve as a batch optimization for planning a day's
shifts across many volunteers, with an explicit **anti-overlap** term so two volunteers don't work
the same corner into diminishing returns.

### 8.3 The recommendation a volunteer actually receives

> **Next 2 hours · best move:** Pine Street Farmers' Market (0.7 mi, 4-min drive).
> Expected **~38 valid signatures** toward **Nevada**, which is **11 days behind pace** for its
> June deadline. Mode: **paper** (NV does not accept digital) — packet #A-114 pre-assigned,
> one sheet per county. Script + eligibility rules attached. Safety check-in on. Tap to accept.

In a digital jurisdiction the same card reads "Mode: **digital** — open the in-app signer, verify
voters in real time, register-and-sign supported," with a much higher expected-valid number because
`validityRate ≈ 1.0` and the register-then-sign uplift applies.

> **Prototyped & runnable:** [`prototypes/optimizer/`](../prototypes/optimizer/) implements the
> marginal-value board (shadow price = `deficit ÷ days-to-deadline`), the next-best-move card, and an
> **optimizer-vs-naive** simulation on the verified data. With the same scarce volunteer-hours, routing
> by marginal value (front-loading CA/TX/NC/FL) cut the leftover **paid bill from ~$267K to ~$189** vs.
> spreading effort uniformly — quantifying why *routing*, not just volunteer count, protects the
> under-$1M path. (Yield/progress are modeled priors per §7.4; the `YieldObservation` loop makes them
> empirical.)

## 9. Engine D — Signature Capture (cell-phone-first where legal)

The volunteer's phone is the capture device. The **mode is dictated by the verified
`StateBallotRule`**, never assumed.

### 9.1 Remote online (AZ E-Qual / NM pattern)

Where a state runs a remote online portal in scope: the volunteer's job shifts from "collect ink" to
"**drive qualified voters to the official portal**." Generate per-voter or per-event share links / QR
codes; the voter signs on their *own* phone through the state system; the state verifies eligibility
and records the signature. Near-zero rejection, no transcription, no chain-of-custody overhead. The
optimizer treats these as top-tier yield when in scope.

### 9.2 In-person digitized (Denver / D.C. eSign pattern)

The volunteer's device runs the in-person signer: the voter signs on the touchscreen (stylus/finger),
the app checks the voter file **in real time**, and where supported **registers or updates** the voter
then captures the signature. Geostamp + timestamp + dedupe. D.C.-style hybrids: the app still produces
a **printable** petition for physical submission — the workflow handles that automatically.

### 9.3 Optimized paper (the default, ~47 jurisdictions)

Most jurisdictions are wet-ink paper. We make paper as fast and high-validity as possible:

- **Pre-assigned packets** keyed to the right county/district, respecting `oneCountyPerSheet`.
- **Scan-to-validate**: photograph each completed sheet; on-device OCR extracts names/addresses and
  produces an **instant estimated-validity** check against the voter file, so volunteers learn their
  real (valid) yield *that day* and bad sheets are caught before submission.
- **Chain of custody**: every sheet has an id; custody transfers are logged (collector → captain →
  notary → filing). Tamper-evident, audit-logged.
- **Witness / notary workflow**: where a notarized circulator affidavit is required (e.g. Colorado),
  the app guides completion and routes to a notary, blocking submission until satisfied.

### 9.4 Mode selection (per signature, per jurisdiction)

The phone **always captures digitally first** (for verification, data quality, dedup, and the
movement ledger). What changes per jurisdiction is the **submission** path:

```text
capture digitally everywhere  → verify against voter file, dedupe, geostamp, (optionally) register-then-sign

then submit per the verified rule:
  if rule.captureMode == remote_online and rule.digitalScope covers this race:
        → submit via official portal (highest yield)
  elif rule.captureMode in (in_person_digitized, hybrid):
        → submit in-app digitized signature (+ print step if hybrid)
  else (paper-only state):
        → CONVERT to compliant wet-ink: print the official form pre-filled from the
          digital capture; obtain the legally-required wet-ink signature + affidavit on the spot;
          submit paper.  (Never submit the digital signature as if it were the legal one.)
        → also record the verified digital signature to the modernization ledger (§9.6)
```

### 9.5 Digital-everywhere capture with compliant submission

We **do not** wait for states to allow digital signatures before using digital tools. In every
jurisdiction, the phone is the capture device — it verifies the voter against the file in real time,
dedupes across the whole drive, supports register-then-sign, and produces a clean record. The legal
status of the state only changes what we **submit**:

- **Digital-accepting states** (AZ E-Qual / NM / Denver / D.C.): submit the digital signature itself.
- **Paper-only states**: the same digital capture immediately **generates the official wet-ink
  petition, pre-filled and verified**, and the voter signs the paper form on the spot (the D.C.
  "sign → print → submit paper" model, applied as the default conversion strategy). The campaign
  submits a fully compliant paper petition — but the volunteer worked at digital speed, the voter was
  pre-verified, and the form is high-validity.

Net effect: **the digital experience and its yield/quality benefits reach all 51 jurisdictions today**,
with zero risk to ballot access, because what gets filed is always what the state legally requires.

**The bright line (designed-in, not optional):** the system never submits a digital signature *as if*
it were a legally valid one where the state requires wet ink, never misrepresents legal status to a
signer, and always keeps a compliant submission path. Pushing the envelope happens through the
movement track below — not by filing signatures we know will be rejected (which is petition fraud and
gets the whole petition, and the candidate, thrown off the ballot).

### 9.6 The modernization movement (reform, advocacy, litigation)

This is the "push the envelope and create a movement" track — and it is where the digital-everywhere
capture becomes a strategic weapon. Every paper-only state still gets a parallel **verified digital
signature** recorded to a **Modernization Ledger**: a cryptographically timestamped, voter-file-verified
record of a real registered voter who chose to sign digitally but whose state refused to count it.

That ledger is the asset. It powers:

- **Litigation / declaratory relief.** A concrete, verified count of disenfranchised voters is exactly
  the evidentiary record for a First Amendment + equal-protection challenge to paper-only mandates.
  There is real precedent: during 2020, multiple courts *authorized* electronic petition signatures
  and cut requirements when paper circulation was burdensome. The ledger turns "this is unfair" into
  "here are 40,000 verified voters your rule silenced."
- **Secretary-of-State pilot advocacy.** Approach SOS offices with a working, audited system and the
  proof points that already exist (Denver, D.C., Arizona, New Mexico) to request E-Qual-style pilots.
- **Public movement.** A "Sign Digital — Modernize Ballot Access" campaign: voters sign digitally,
  see "your state won't count this yet — here's who to ask to change it," and are routed into pressure
  on their SOS and legislature. The campaign's own content/AI tooling drafts the advocacy materials
  (human-approved) and the coalition outreach.
- **Open standard.** Publish the open-source digital-signature + real-time-verification spec so any
  campaign or state can adopt it — consistent with CampaignOS's "Linux of democratic participation"
  posture. The goal is structural change, not a proprietary edge.

**Always paired with the compliant path.** In a paper-only state we still obtain the wet-ink signature
that actually counts (§9.5). The movement runs *alongside* a fully compliant drive — it never replaces
it, and it never gambles the candidate's ballot access on an unproven legal theory. Counsel owns the
litigation/advocacy strategy; the product surfaces risk and evidence, and is explicitly not legal advice.

---

## 10. Volunteer Experience (the field loop)

One screen, one action at a time (extends the existing PWA / VolunteerOS field design):

1. **Home** — "Your next best move" card (§8.3) + today's personal valid-signature count and its
   contribution to the most at-risk state.
2. **Accept** — route, time window, mode, eligibility rules, script, safety check-in.
3. **Capture** — digital signer or paper packet + scan, one signer at a time, offline-tolerant.
4. **Live feedback** — running *valid* (not raw) count; gentle nudge if the spot is saturating
   ("yield dropping — a better spot is 6 min away").
5. **Wrap** — submit batch / hand off packet (custody), check out, see impact ("you moved Nevada from
   red to yellow").
6. **Certification gating** — volunteers can only accept assignments in jurisdictions where they are
   a legally eligible circulator and have completed the required training module.

Design constraints carried from the existing plan: large tap targets, low-bandwidth mode,
offline-first capture with conflict-free sync, and safety check-in/escalation for field shifts.

---

## 11. Compliance, Legal & Anti-Fraud Guardrails

This is regulated activity; the guardrails are not optional.

- **Eligibility enforcement at assignment**: an ineligible circulator is never routed to a
  jurisdiction they can't legally circulate in.
- **No invalid digital usage**: digital capture is enabled only where `captureMode` + `digitalScope`
  explicitly cover the race, confirmed via §5.5 verification (and defaulted OFF until it is).
- **Anti-fraud**: real-time voter-file matching, device geostamp + timestamp, one-signer-at-a-time
  liveness, dedupe across the whole drive, and anomaly detection (impossible velocity, duplicate
  devices). **No pay-per-signature** logic — many states ban it and it incentivizes fraud.
- **Chain of custody** end-to-end for paper; tamper-evident logs.
- **Conservative defaults (load-bearing — there is no counsel gate)**: unknown / conflicting / stale /
  interpretation-class rule → the optimizer uses the **strictest** interpretation (over-comply) and the
  field is loudly flagged; uncertainty costs effort, never ballot access (§5.5).
- **Compliant submission always wins** (the §9.5 bright line): a digital signature is never submitted
  as the legal one where wet ink is required; a compliant path is always present; the reform
  experiment never gates ballot access.
- **Honest disclosure to signers**: in a paper-only state the signer is told their digital signature
  supports modernization and that we'll also capture the wet-ink that legally counts — no
  misrepresentation of legal status. Advocacy use of their data is separately consented.
- **No counsel gate — fail safe instead**: with no attorney to sign off, rules go live through §5.5
  automated verification; on any uncertainty the optimizer uses the strictest interpretation and the
  system escalates interpretation-class questions to the state election office in writing. The product
  never asserts legal certainty and never treats a rule as trustworthy on AI judgment alone.

---

## 12. Privacy & Security

Signer data is sensitive PII tied to political activity.

- **Minimize**: collect only what the petition legally requires.
- **Encrypt** at rest and in transit; strict RBAC; signer PII access is least-privilege and audited.
- **Voter-file use** is governed by each state's legal-use restrictions; honor them per jurisdiction.
- **Consent & retention**: capture is for the ballot-petition purpose; retain only as long as needed
  for submission/challenge windows, then purge; device caches of signer data expire on a short timer.
- **Audit**: every validation, export, and custody transfer is an append-only audit event.

---

## 13. Metrics / Success Criteria

- **Valid signatures per volunteer-hour** (the north star), by jurisdiction and capture mode.
- **Cost per valid signature** vs. paid-firm benchmark ($1–$10+).
- **Projected completion date vs. deadline**, per jurisdiction (the risk board: green/yellow/red).
- **Rejection rate** by location, mode, and circulator — closes the loop into the yield model.
- **% digital vs. paper**, and digital yield uplift where available.
- **Buffer accuracy**: did modeled rejection match actual?
- **Volunteer outcomes**: retention, perceived usefulness, safety incidents (must stay ~0).
- **Movement metrics**: verified digital signatures recorded in paper-only states (the ledger size),
  SOS pilot conversations opened, jurisdictions that adopt/expand digital, litigation milestones.

---

## 14. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Wrong legal rule | Jurisdiction's petition invalidated; off the ballot | Per-state subagent + **§5.5 layered automated verification** (consensus + adversarial + citation-grounding + recompute) + **conservative fail-safe** (over-comply when unsure) + SOS-inquiry for interpretation + change watch. No counsel gate — so the fail-safe is load-bearing |
| No legal-interpretation authority | A genuinely ambiguous rule is guessed wrong | Default to strictest interpretation; **draft a written inquiry to the state election office** (free, authoritative); never let the optimizer rely on an unresolved interpretation |
| Digital used out of scope | Signatures rejected | `digitalScope` gate, default paper, reviewer sign-off |
| Over-optimizing safe states | Behind-pace states miss deadline | Marginal-value shadow price → 0 once safe |
| Model over-collects / under-collects | Wasted hours or missed goal | Buffer from measured rejection; recompute pace daily |
| Fraud / bad-faith signatures | Legal exposure, mass invalidation | Real-time verify, geostamp, dedupe, anomaly detection, no pay-per-sig |
| Solicitation on private/illegal ground | Volunteers ejected/cited | `SolicitationZone` + permit/public-forum check before assignment |
| Volunteer burnout / safety | Attrition, harm | One-action UX, saturation-aware routing, check-in/escalation |
| Signer privacy breach | Severe trust/legal harm | Minimize, encrypt, RBAC, short retention, audit |
| Reform experiment jeopardizes ballot line | Candidate off the ballot; legal exposure / fraud | §9.5 bright line — compliant wet-ink always obtained and submitted; digital reform runs strictly *parallel*; counsel owns litigation strategy |
| Signer confusion about what "counts" | Trust damage, invalid expectations | Honest in-flow disclosure; separate advocacy consent; clear "your state won't count this *yet*" messaging |

---

## 15. Integrations

- **Voter file / registration data** per state (verification + eligibility), under legal-use terms.
- **Official digital systems**: AZ E-Qual, NM portal, Denver/D.C. eSign (where in scope).
- **Maps & routing** (travel cost, isochrones) — Mapbox / OSM.
- **Events**: campaign `Event` calendar + civic/venue/university/market feeds.
- **Weather** (footfall modeling).
- **Notary** workflow (where affidavits require it).
- **Storage** for scanned packets; **OCR** for scan-to-validate.

Design every one as an adapter, not a hard dependency (carry-over from the platform plan).

---

## 16. Phased Delivery

- **Phase 0 — Rules spine.** Stand up `StateRuleAgent`s for all 51 jurisdictions; produce cited,
  auto-verified `StateBallotRule` records (§5.5); `BallotAccessTarget` goals/buffers/deadlines; the
  green/yellow/red risk board. *(Nothing optimizes yet, but the campaign already has the best
  ballot-access dashboard in existence.)* **DONE — all 51 jurisdictions verified, no human counsel:**
  the `ballot-rules-batch` workflow verified all 50 states + DC end-to-end → **🟢 265 AUTO-LIVE / 🟡 92
  CONSERVATIVE-HOLD / 🔴 2 BLOCKED, 95 SoS inquiries** queued. Full board + per-state detail in
  [`BALLOT_ACCESS_VERIFIED_RULES.md`](./BALLOT_ACCESS_VERIFIED_RULES.md); structured seed in
  `ballot-access-data/verified-rules.master.json` (+ per-state files in `states/`). Notable saves: GA
  (held off the stale 2016 court-capped 7,500), AL (caught a wrong Sept-6 deadline → actual 74-day /
  Aug-23), AK (official packet self-contradicts 3,409 vs 3,614 → held the higher), and many states
  caught anchoring on expired 2024 dates. The sweep hit the usage cap once mid-run; partial results were
  **salvaged and merged**, proving the pipeline is durable/resumable across usage windows.
- **Phase 1 — Paper, optimized.** Packet assignment, scan-to-validate, chain of custody, notary
  workflow, per-volunteer valid-yield tracking. Marginal-value pace model (deadline shadow prices).
- **Phase 2 — Opportunity & events.** Location/event ingestion, `SolicitationZone`, yield priors,
  and the "best use of your next N hours" recommendation.
- **Phase 3 — Digital capture everywhere + the movement.** Real-time-verified digital capture in all
  51 jurisdictions; submit-as-digital where accepted, convert-to-compliant-wet-ink everywhere else
  (§9.5); the Modernization Ledger and the "Sign Digital — Modernize Ballot Access" advocacy flow
  (§9.6), with the litigation evidentiary export.
- **Phase 4 — Full optimization.** Online-learned yields (bandit), multi-volunteer batch assignment
  with anti-overlap, route optimization, and statewide what-if planning.

---

## 17. Open Questions

1. How do we license/access each state's voter file fast enough for real-time verification, within
   legal-use limits? (Per-state legal + data work; may gate Phase 3 in some states.)
2. For distribution-rule states, what's the right granularity of marginal value — congressional
   district, county, or finer?
3. How aggressively should we register-then-sign, and how do we keep that flow squeaky-clean legally?
4. Where digital exists only for *nomination* petitions, is there any path to extend scope, or do we
   simply treat those states as paper for an independent presidential run?
5. What is the right buffer policy when a state's historical rejection rate is unknown (new drive)?
6. Which paper-only states are the best first targets for a digital-signature legal challenge, and
   what verified-ledger threshold makes the strongest standing/evidentiary case?
7. What is the cleanest consent model that lets a signer's verified digital signature be used for
   advocacy/litigation without compromising their privacy or the compliant wet-ink they also gave?

---

## 18. How This Threads Into Existing CampaignOS Architecture

- **AI layer**: `StateRuleAgent`s reuse the provider abstraction + approved-source RAG + citation
  validation. This is the strongest use case for "source-backed, automatically-verified AI" in the
  product — here the accountability (and the conservative fail-safe that stands in for counsel) is
  load-bearing, not theater.
- **Audit & RBAC**: rule verification, signature validation, custody transfers, and exports are all
  append-only audit events; circulator certification rides the existing RBAC/capability model.
- **VolunteerOS / PWA**: the capture loop extends the existing field-organizing, offline, and
  safety-escalation design.
- **Compliance module**: ballot-access risk joins fundraising compliance under one conservative,
  warning-first treatment.
- **Templates**: ships inside the **Presidential campaign** template (the initial focus) as the
  flagship BallotAccessOS capability.
