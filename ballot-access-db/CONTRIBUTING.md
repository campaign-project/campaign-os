# Contributing to BallotAccessDB

This dataset is only useful if it's **trustworthy**. A wrong figure can cost a campaign its
ballot line. So the bar for any change is high and specific — and it's the same bar the
dataset is already built to.

## The two rules

1. **Primary sources, quoted verbatim.** Every claim needs a citation to a *primary* source —
   the statute, the Secretary of State's official page/PDF, the official price list — with the
   exact text quoted. Secondary sources (Ballotpedia, NASS, news) are useful corroboration but
   are *frequently stale* and never sufficient on their own. A citation whose quote does not
   actually appear at the URL will be rejected (we check).
2. **Conservative when uncertain.** Where a rule is genuinely unsettled (an open interpretation,
   a conflicting source, a pending injunction), the record takes the **strictest** reading —
   higher count, earlier deadline, notarization assumed, per-signature pay assumed *not*
   permitted — and is gated `CONSERVATIVE-HOLD` with an open Secretary-of-State inquiry. We never
   relax a rule on a hunch. Uncertainty should cost effort, never ballot access.

## What's the most valuable contribution

- **A stale figure** — a requirement, deadline, or fee that changed (these move every cycle).
  Include the new primary-source quote and its effective date.
- **A better primary source** for an existing record (especially upgrading a `CONSERVATIVE-HOLD`
  to `AUTO-LIVE`, or resolving an open SoS inquiry).
- **A fix** to a value we got wrong — with the controlling citation.
- **`verifiedAsOf` refreshes** — re-confirming a record that's past its re-check window.

## How to file it

Open an issue (preferred) or a PR with:

- the **jurisdiction** and the **field** (e.g. `Ohio` / `signaturesRequired`);
- the **current** value vs. the **correct** value;
- a **primary-source URL + verbatim quote** and its **effective date**;
- whether you believe the field should be `AUTO-LIVE`, `CONSERVATIVE-HOLD`, or `BLOCKED`.

## Don't hand-edit `data/`

The files in `data/` are **generated** — they're compiled and schema-validated from the
internal verified graph by `build.ts`. Editing them directly will be overwritten on the next
build. Changes flow into the source graph (via your issue/PR + a maintainer re-verification),
then `node build.ts` regenerates `data/` and re-validates every record against
`schema/ballot-access-rule.schema.json`. A change that breaks the schema fails the build.

## Scope (v1)

v1 covers **independent presidential** petitioning across the 50 states + DC. Other offices
(congressional, statewide, initiative/referendum) and additional dimensions are roadmap, not
yet in scope — but the schema and pipeline are designed to extend to them.

## Not legal advice

Contributions are verified facts, not legal counsel. See [LICENSE](./LICENSE). When in doubt
about an interpretation, the right move is an **inquiry to the Secretary of State in writing**
(free, authoritative) — that's how `CONSERVATIVE-HOLD`s get resolved here.
