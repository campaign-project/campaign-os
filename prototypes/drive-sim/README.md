# End-to-End Drive Simulation

> The whole CampaignOS stack working as one thing — qualifying a pilot state from
> empty to on-the-ballot, with every layer feeding the next.

```bash
node --experimental-strip-types drivesim.ts     # Node ≥ 22.6, zero install
```

This is the synthesis of every prototype. It qualifies **Ohio** (5,000 valid signatures,
90-day window — grounded in `verified-rules.master.json`) by running the full pipeline
day by day:

```
optimizer  → routes a fixed volunteer-hour pool across gatherers by expected VALID
             signatures/hour ( = raw-rate × the yield model's current validity belief )
gather     → each routed gatherer-hour produces raw signatures
loader     → voters loaded through the REAL Ohio adapter (free-download tier)   ← load.ts
validation → every captured signature scored against that voter file            ← validate.ts
yield      → observed validity feeds the Beta-Binomial model → tomorrow's routing ← yield.ts
cost       → any gap remaining at the deadline is bought as paid signatures
```

## The point it proves

One gatherer (**Cara**) is a **trap**: she has the *highest* raw output (16 sigs/hr) but
the *lowest* validity (35%). At cold start the optimizer believes everyone is ~80% valid,
so her raw volume makes her look like the best bet — and on **day 1 it routes 16 hours to
her**. The validation engine immediately scores her captures and the yield flywheel learns
she's ~37%; from **day 2 on she gets zero hours.**

Run the same scenario two ways:

| Strategy | Valid gathered | Hrs on the trap gatherer | Paid gap | Cost |
|---|---|---|---|---|
| naive (even split) | 4,596 (404 short) | 120h | 404 sigs | **$3,535** |
| optimizer + yield | 5,000 ✓ | 16h (just day-1 learning) | 0 | **$0** |

Same four volunteers, same 12-day deadline. Validity-aware routing qualifies Ohio for **$0
paid**; the even split leaves a paid gap because it keeps spending a third of every day on
signatures that don't survive review.

This is the cost model's national **$267K → $189** result (RFC-001 §8) at the per-state
level — but now driven by **real validation + learned yield**, not assumed rates. Ohio's
own cost is a rounding error against the <$1M national budget; the *method* is what makes
the expensive states (CA/TX/NC/FL) fit under it.

## What's real vs. modeled

- **Real (runs the actual code):** the Ohio voter file is serialized in OH's true format and
  loaded through the production adapter; every signature is scored by the real matcher +
  validity law; the yield model is the real Beta-Binomial from `../optimizer/yield.ts`.
- **Modeled (sim ground truth, labeled in code):** each gatherer's hidden raw-rate and true
  validity, the volunteer-hour pool, the deadline, and CPRS. These are the knobs; the
  optimizer is *not* told them — it learns validity through the flywheel.
- **Synthetic, no PII:** voters are fabricated (the same rule as everywhere — map/parse the
  files, never commit the people).

## Multi-state routing (`multistate.ts`, `npm run multistate`)

The single-state sim optimizes *within* one state. A national drive runs many at once —
one shared volunteer pool, each state with its own requirement, deadline, and voter-file
*format*. `multistate.ts` is the capstone: **Ohio (5,000), Mississippi (1,000), Washington
(1,000), Vermont (1,000)** — real requirements, loaded through four *different* adapters
(comma/utf-8, comma/utf-8, pipe/win-1252, pipe/win-1252) in one run.

It adds the two things that only matter across states:

- **Shadow-price competition** — each state's marginal value = remaining deficit ÷ days
  to deadline. The optimizer keeps every state *on pace* (fills by shadow price); naive
  round-robins the pool, blind to which state is big or urgent.
- **Per-(state × gatherer) yield** — validity is state-specific. The flywheel keys
  observations `gatherer@STATE`, so it learns e.g. that **Eli is 93% valid in Ohio but 56%
  in Washington** — and the optimizer keeps him home (83% of his hours in OH) instead of
  wasting him out of state.

Result: same pool, same deadlines — the optimizer qualifies **all four states for $0**,
while round-robin **starves Ohio** (the big, urgent one), over-serves the small states, and
can't recover by deadline → a **~$14.7K** paid gap. The learned per-state map is persisted
to the yield store, so the next national drive starts warm. This is the national-portfolio
version of the cost model's routing thesis — the lever that keeps the whole 51-state map
under the <$1M budget.

## The prototype stack, end to end

`multistate` closes the loop the project set out to prove: **rules graph + voter-file map →
validation engine (matcher / adapters / streaming / freshness) → optimizer + yield flywheel
→ persistent store → drive sim → multi-state routing → live Gather capture.** Each layer
runs real code over the others; each drive leaves the system smarter than it found it.
