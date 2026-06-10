# CampaignOS — Bottom-Up Cost Model: National Ballot Access for Under $1M

**What this is.** A bottom-up estimate of what it costs an independent presidential candidate to
petition onto the ballot in all 51 jurisdictions today, and how far the CampaignOS levers push that
toward the **under-$1M north star** (§1.3 of the business model). **Grounded inputs** (per-state
signature requirements, cost-per-signature range) are separated from **modeled assumptions** (the
lever factors), which are labeled as estimates.

## 1. Inputs (grounded)

- **National required signatures: ~1,008,312** — sum of the controlling statewide requirement for an
  independent presidential drive across 51 jurisdictions (curated from `verified-rules.master.json`;
  figures recompute each cycle).
- **Cost per required signature (CPRS): $3 (low) / $7 (mid) / $12 (high)** — grounded in Ballotpedia
  CPRS data; CPRS already bakes in over-collection + the ~80%-validity buffer.

## 2. Baseline — what it costs today (all paid firms)

| CPRS | national cost |
|---|---|
| $3 (low) | **$3,024,936** |
| $7 (mid) | **$7,058,184** |
| $12 (high) | **$12,099,744** |

So today's reality is roughly **$3,024,936–$12,099,744** — consistent with
reported independent-presidential ballot-access spends (single-digit to ~$15M millions).

## 3. The levers (MODELED — labeled estimates)

Each attacks the paid portion. Factors are assumptions, not measurements:
- **Volunteer share (V)** — fraction of signatures gathered free by the movement.
- **Digital share (D)** — fraction captured digitally where legal (≈$0 marginal); small today, grows with the modernization push.
- **Validation factor** — the engine cuts over-collection waste → lower effective paid CPRS.
- **Optimizer factor** — routing + per-signature efficiency → lower paid CPRS.
- *(Plus:* the open rules graph removes the legal/consultant overhead traditional drives carry — modeled qualitatively, not in the number.)*

## 4. Scenarios (lever stack × CPRS)

| lever stack (V / D / valid / opt) | $3 CPRS | $7 CPRS | $12 CPRS |
|---|---|---|---|
| **conservative** (25% vol / 5% dig / 0.85 / 0.92) | $1,655,850 | $3,863,650 | $6,623,400 |
| **mid** (45% vol / 10% dig / 0.75 / 0.85) | $867,779 | $2,024,817 | $3,471,114 |
| **aggressive** (65% vol / 15% dig / 0.7 / 0.8) | $338,793 | $790,517 | $1,355,171 |

> Read: with the **aggressive** movement stack at low–mid CPRS, the national cost falls to
> **$338,793–$790,517** — i.e. **under $1M is reachable**, but only under aggressive-but-plausible assumptions.

## 5. The $1M question — breakeven volunteer share

Holding digital/validation/optimizer at their **mid** values, the volunteer share needed to land at exactly $1M:

| CPRS | volunteer share to hit $1M |
|---|---|
| $3 (low) | 38% of signatures volunteer-gathered |
| $7 (mid) | 68% of signatures volunteer-gathered |
| $12 (high) | 77% of signatures volunteer-gathered |

**Verdict:** the dominant lever is **volunteer participation.** At low CPRS the target is easy; at
mid CPRS it needs roughly **two-thirds of signatures gathered by volunteers** (the rest paid,
verification-optimized). That is exactly why the *movement* (not the paid marketplace) is the
cost-reduction engine — and why per-signature pay is for the *marginal* paid signatures, not the bulk.

## 6. Where the cost is concentrated (focus here)

| state | required sigs | cost @ $7 | cumulative % of national |
|---|---|---|---|
| California | 219,403 | $1,535,821 | 22% |
| Florida | 145,040 | $1,015,280 | 36% |
| Texas | 113,151 | $792,057 | 47% |
| North Carolina | 83,874 | $587,118 | 56% |
| New York | 45,000 | $315,000 | 60% |
| Michigan | 44,620 | $312,340 | 65% |
| Arizona | 42,303 | $296,121 | 69% |
| Indiana | 36,943 | $258,601 | 72% |

The top 8 jurisdictions are **72%** of the national cost. A handful of big
states (CA, FL, TX, NC, NY, AZ, IN, OK) dominate — so the levers (volunteers, digital, validation)
matter most *there*. Win the big states cheaply and the national number collapses.

## 7. Sensitivity & caveats (honest)

- **Georgia is the biggest single swing:** modeled here at the court-capped **7,500**; the strict
  per-elector reading is **~120,000** → +$787,500 at mid CPRS. (Verified data holds the strict reading conservatively.)
- **Estimated/contested counts:** Nevada and New Mexico are estimates; Florida/others recompute each cycle. National total is ±10–15%.
- **Residency limits the mix:** 6 states require in-state circulators (NY, CT, ID, MO, NJ, SD) → can't import a national paid/volunteer pool there; local supply needed.
- **Lever factors are assumptions**, not measured. The `YieldObservation` loop (RFC-001 §7) replaces them with real data over time; that's when this model becomes empirical.
- **The number excludes** filing fees, electors'-slate paperwork, legal, and the non-signature filing gates that can still knock a candidate off (RFC-001).

## 8. Bottom line

Today: **~$3,024,936–$12,099,744.** With the full lever stack: **~$790,517–$3,863,650** (mid CPRS).
**Under $1M is achievable — contingent on movement-scale volunteer participation (~2/3 of signatures),
validation-driven efficiency, and digital expansion — concentrated on ~8 high-cost states.** It is a
stretch goal with a credible path, not a given. The model says *what has to be true* for $1M to hold.
