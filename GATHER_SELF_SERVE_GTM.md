# Gather — Self-Serve (PLG) Go-To-Market

**Status:** proposal / early-testing track · drafted 2026-06-08
**Companion docs:** [`GATHER_APP_ARCHITECTURE.md`](./GATHER_APP_ARCHITECTURE.md) (RFC-002, the app) · [`VOTER_FILE_LAWFUL_BASIS.md`](./VOTER_FILE_LAWFUL_BASIS.md) (the gating legal question) · [`BALLOT_ACCESS_DB_GTM.md`](./BALLOT_ACCESS_DB_GTM.md) (the DB's partner GTM)

---

## Thesis

Don't gate early testing on partnerships. **Optimize the app for a few campaigns that are actively gathering signatures right now, and let circulators start using it of their own free will.** This is product-led growth (PLG), and it fits Gather specifically because **the core value accrues to the individual circulator, not just the campaign**:

- Live, offline validity prediction means *they* waste less effort and, where pay is per-valid-signature, *earn more*.
- That personal incentive is strong enough to drive solo adoption — the precondition for bottom-up growth that "civic tech" usually lacks.

Partnerships aren't abandoned; they're **resequenced**. Bottom-up usage *earns* the partnership (land-and-expand), and — critically — produces the data moat without a single deal.

## Why it fits Gather (not generic optimism)

1. **The architecture already assumes standalone use.** The app is offline-first, device-as-cache, validator self-contained, server only ships a per-geography index. There is no campaign IT integration to wait on. A circulator is useful to *alone*, today. ("Assigned by an optimizer/partner" was always a thin layer — now swapped for "pick a campaign gathering near you.")
2. **You harvest the moat without deals.** Every validation a self-serve circulator runs feeds the yield store — validity by location/gatherer/capture. The intelligence moat the business rests on is produced *by usage*, not by enterprise contracts.
3. **Bottom-up earns the partnership.** Once a chunk of a campaign's circulators are quietly using it and their valid-rate is visibly higher, the committee is the inbound lead, not the cold target.
4. **The timing is right now.** June 2026 is prime signature season for **November 2026 ballot initiatives** — hard summer deadlines, active collection. (We already expanded BallotAccessDB to cover initiative petition types.)
5. **Paper-assist removes the gatekeeper.** The binding artifact is wet ink the circulator turns in to the campaign — so the campaign gets the deliverable regardless of what tool was used. Nobody's permission is required to *help* a circulator.

## The beachhead: the free-voter-file initiative sandbox

The one hard gate is voter-file lawful basis (see [`VOTER_FILE_LAWFUL_BASIS.md`](./VOTER_FILE_LAWFUL_BASIS.md)). The cleanest sandbox removes both cost and the most drag: **free-voter-file states**, of which we mapped seven — **NC, OH, MS, FL, OK, VT, WA** (see [`VOTER_FILE_ACQUISITION.md`](./VOTER_FILE_ACQUISITION.md)).

Filter those by "has a usable citizen-initiative process actively collecting for Nov 2026":

| Free-file state | Citizen initiative? | 2026 status | In sandbox? |
|---|---|---|---|
| **Ohio** | Yes | Collecting (summer deadline) | ✅ |
| **Oklahoma** | Yes | Collecting (90-day windows) | ✅ |
| **Washington** | Yes (Initiative to the People) | Collecting (~early-July deadline) | ✅ |
| Florida | Yes | Window closed (~Feb 1 deadline) | ⛔ this cycle |
| North Carolina | **No statewide initiative process** | — | ⛔ |
| Vermont | **No statewide initiative process** | — | ⛔ |
| Mississippi | Process **struck down 2021** (state Supreme Court) | — | ⛔ |

> **Structural claim — grounded (2026-06-08, Wikipedia "Initiatives and referendums in the United States").** Confirmed: OH and WA have citizen-initiative processes; NC and VT do not appear among the initiative states; **MS's process was effectively ended by a May 2021 Mississippi Supreme Court decision** (the §273(3) five-congressional-districts flaw); FL has the process (its issue is deadline timing). OK is a known State-Question state. So the OH/OK/WA sandbox holds.
>
> ⚠️ **Still to verify before launch:** the specific 2026 measures, sponsoring committees, signature requirements, and filing deadlines — these live on Ballotpedia / each Secretary of State, which were **unreachable this session** (host-level egress allowlist blocks them; `wick_search` is down; Wikipedia *is* reachable). Re-ground via Wikipedia state-election pages and SoS when access allows.

**→ The live free-file initiative sandbox for summer 2026 is OH / OK / WA.** Free file = no acquisition cost + the least licensing drag, while we validate the riskiest assumptions cheaply.

## What's built (2026-06-08)

The app now *is* the self-serve flow:

```
Onboarding (first run)
   → CampaignPicker  "campaigns gathering near you"  ← NEW self-serve entry
       → Briefing for the picked campaign (map hero, directions, forms, Start)
           → Collect / Queue (validate · log · sync)
```

- `src/data/campaigns.ts` — a `Campaign[]` directory (seeded with OH/OK/WA, flagged illustrative).
- `src/store/campaign.ts` — the active-campaign store; every screen reads the picked campaign.
- `src/screens/CampaignPicker.tsx` — the directory: status, deadline countdown, requirement, pay basis, free-file badge; "no sign-up to start."
- Briefing/Collect/Impact/Map all parameterized by the selected campaign (jurisdiction drives the engine's verification mode; compensation drives the earnings panel).

Seed campaigns (ILLUSTRATIVE — verify live before use):

| Campaign (seed) | State | Type | Pay basis (demo) |
|---|---|---|---|
| Ohio Minimum Wage Increase | OH | initiated constitutional amendment | per-valid-signature |
| Oklahoma Paid Sick Leave | OK | initiated statute | hourly (per-sig restricted) |
| Washington Housing Affordability Act | WA | initiative to the people | volunteer |

(The three pay bases are deliberate — they exercise the compliance-driven earnings panel end to end.)

## The riskiest assumptions (test these, cheaply, before building more)

The app working is **not** the risk. These are:

1. **Lawful basis to serve unaffiliated circulators.** The gate. → [`VOTER_FILE_LAWFUL_BASIS.md`](./VOTER_FILE_LAWFUL_BASIS.md). Likely resolution: operate as an authorized petition-support vendor (a *thin* tie, not an enterprise deal) and/or verdict-only-no-PII architecture; start in OH/OK/WA.
2. **Discovery + density.** Will individual circulators find it and pick it, and is there enough concurrent activity in one geography to feel alive (the live map's whole premise)? → Concentrate seeding on 1–2 hot turfs per state, not spread thin.
3. **Accuracy / trust.** A self-serve user has no SLA. The conservative banding (never false-VALID; NEEDS_REVIEW excluded from "safe") is the protection — measure real precision against post-submission validation.
4. **Conversion to paid / to partnership.** Does individual usage actually pull the committee in? Watch for the first campaign that asks for the aggregate view.

## Metrics that matter

- **Activation:** % of installs that pick a campaign and log ≥1 signature.
- **Valid-rate lift:** valid % for app-assisted captures vs. the campaign's baseline (the core proof).
- **Cross-campaign retention:** circulators who work a 2nd/3rd campaign (circulators are repeat, multi-campaign — this is the wedge to a durable user base).
- **Geo density:** concurrent active circulators per turf (drives the "movement is alive" feel and word-of-mouth).
- **Sync rate / data yield:** observations reaching the yield store (the moat accruing).

## Bottom-up → partnership (land-and-expand)

1. **Land:** circulators self-serve in OH/OK/WA on active initiatives.
2. **Prove:** their valid-rate beats baseline; the yield store fills.
3. **Expand:** the committee adopts the aggregate dashboard + routing (now warm/inbound); we add the per-campaign index + compliance tier.
4. **Repeat:** each campaign's circulators are next cycle's installed base, across states.

## Open questions / next steps

- [ ] Re-ground OH/OK/WA seeds against Ballotpedia + SoS (verify orgs, requirements, deadlines, pay legality per state).
- [ ] Resolve the lawful-basis question with counsel for OH/OK/WA (see memo) — **blocking** for real (non-synthetic) voter data.
- [ ] Decide the "thin tie" model: authorized-vendor letter per campaign vs. operator-direct file eligibility per state.
- [ ] Build the per-campaign per-geography index pipeline (today the app shares one synthetic Ohio index).
- [ ] Seed 1–2 concrete turfs per state for density; instrument the activation/valid-lift metrics.

## Caveats

- Seed campaigns + numbers are **illustrative**, pending verification.
- The voter index is shared synthetic Ohio data in the prototype; production ships a per-campaign, per-geography index.
- Nothing here is legal advice; the lawful-basis memo gates which states can use real voter data.
