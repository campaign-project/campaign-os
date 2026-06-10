# Ballot-Access Optimizer (prototype)

The optimization engine from [`BALLOT_ACCESS_OPTIMIZATION_PLAN.md`](../../BALLOT_ACCESS_OPTIMIZATION_PLAN.md)
§7–8, runnable on the verified data. Its objective (from the cost model): **minimize the cost/time to
qualify nationally by routing volunteer-hours to maximize *valid signatures per hour*, weighted by each
jurisdiction's deadline-risk.**

```bash
node --experimental-strip-types optimize.ts     # Node ≥ 22.6, zero install
node --experimental-strip-types yielddemo.ts     # the Moat-B yield flywheel (below)
```

## What it computes

1. **Marginal-value board** — the per-state *shadow price* = `deficit ÷ days-to-deadline` (valid
   signatures/day still needed to hit `goal × 1.5` by the deadline). A state that's met its buffer drops
   to **zero** value; a big state behind pace near its deadline dominates. This is "where to send the
   next volunteer-hour."
2. **Next-best-move** — for one volunteer (state + free hours): ranks opportunity types by
   `expected valid signatures × the state's marginal value`, and nudges mobile volunteers toward the
   drive's hottest state if their own is low-priority.
3. **Optimizer vs. naive** — the same volunteer-hours, allocated by marginal value vs. spread uniformly,
   then any gap at each deadline is bought as paid signatures. **Demonstrated result: naive leaves a
   ~$267K paid bill; the optimizer leaves ~$189** (~100% of the paid cost eliminated) — because it
   front-loads the high-deadline-risk states (CA/TX/NC/FL) so volunteers finish them in time, instead of
   starving them and paying premium for the gap.

## Grounded vs. modeled

- **Grounded:** per-state signature requirements + filing deadlines, from `verified-rules.master.json`.
- **Modeled (labeled in code):** the drive's current progress (a deterministic sim where uniform early
  effort leaves big states behind), the volunteer-hour budget, and per-state absorption.
- **Now closed-loop:** the yield-per-hour numbers no longer have to stay priors — see the flywheel below.

## The Moat-B yield flywheel (`yield.ts` + `yielddemo.ts`)

The optimizer routes by *valid* signatures/hour, but validity is unknown at cold start. `yield.ts` is a
**Beta-Binomial** model: it begins at the RFC-001 §7.4 priors (≈0.80; digital-with-verify ≈0.97) and
folds in the validation engine's observed validity — by **gatherer**, **location (ZIP)**, and **capture
format** — so the estimate converges to each slice's true rate as signatures accumulate. A weak per-
gatherer prior (strength 8) is learned fast; a stronger capture-format prior holds where we already know
the answer.

`yielddemo.ts` proves the whole chain — **loader → validation engine → yield model → routing**:

1. Synthesizes distinct voters, writes them in **Washington's real pipe format**, and loads them back
   through the WA adapter (so the index comes through the real loader).
2. Simulates gatherers with different true validity (Ava 0.95 / Ben 0.75 / Cara 0.35); each batch runs
   through the validation engine and its observed slices feed the model.
3. Shows the posteriors converge from the 0.80 cold start to the true rates
   (`Ava 80→91→93→95 · Cara 80→58→46→39→37`), flipping `prior → blended → observed`.
4. Shows the routing flip: cold start values all three identically (9.6 valid/hr → no signal);
   data-informed valuation sends the next hour to Ava (11.4 valid/hr) and flags Cara (4.4 → retrain /
   stop per-sig pay).

This is the compounding moat in code: every signature processed makes the next routing decision better.
The same `YieldObservation` data is the proprietary "validity by location × gatherer × format" asset
nobody else has.

## Persistent cross-drive store (`yieldstore.ts` + `yieldstoredemo.ts`)

In memory, the flywheel forgets between runs — every drive restarts at the 0.80 prior and re-pays the
"learning tax" (hours wasted on a low-validity gatherer before the model figures it out). `yieldstore.ts`
persists the accumulated Beta-Binomial counts to a JSON store so the **next drive starts warm**. Pure
state lives in `yield.ts` (`snapshot()` / `merge()` — no I/O); this file owns the disk.

```
const model = warmModel(path);            // seed from everything learned so far
…run the drive, model.observeReport(…)…   // observe on top
saveStore(path, model, { newDrive: true }); // persist the accumulated total
```

Because the state is additive `{valid,total}` counts, compounding across drives is just integer
addition. `yieldstoredemo.ts` (`npm run store`) proves it end to end: Drive 1 learns Cara ≈ 36% and
persists; a model **warmed from the store routes 0h to Cara on day 1**, while a cold model still burns
16h re-discovering the trap (the learning tax, paid once ever instead of every drive); Drive 2's
observations compound onto Drive 1 (`Cara n: 300 → 600`, posterior tighter). The store *is* the durable
moat.

## How it connects

This is the engine behind the cost model's central finding: the dominant cost lever is volunteer
participation, and *routing* those volunteers by marginal value (not spreading them evenly) is what
keeps the paid gap — and thus the path to the **under-$1M** north star — small.
