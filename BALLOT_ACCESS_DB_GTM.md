# BallotAccessDB — Go-to-Market (internal)

**Goal of the launch:** not stars — *signal*. Putting BallotAccessDB into the world is the
cheapest way to learn the one thing prototypes can't tell us: **who actually needs this, and
who the buyer is.** The answer reorders everything downstream (pilot states, product
priorities, even the legal entity). Target for the first 30 days: **one real design-partner
conversation.**

This doc is internal — keep it out of the public `ballot-access-db/` repo.

---

## Design-partner archetypes (who to put it in front of)

### 1. An active independent / third-party presidential effort  ← the anchor-tenant case
- **Why them:** the acute, headline use case — they feel the 51-rulebook pain directly and
  validate the *whole* stack (data → validation → routing → "under \$1M"). They also generate
  the proprietary yield data (Moat B).
- **Where to find them:** FEC filings (declared 2028 candidates / draft + principal campaign
  committees); the Libertarian, Green, and independent-candidate orgs; the ballot-access
  activist community (Ballot Access News / Richard Winger's network is the hub).
- **Offer:** free use of the data **and** the validation + optimization tooling to qualify,
  in exchange for being state-zero — feedback, a real drive to learn from, and the yield data.
- **Risk to manage:** FEC / campaign-vs-company entanglement (defer commitments until the
  structure question is resolved — see the recommendation memo).

### 2. A ballot-initiative / referendum committee  ← the recurring revenue base
- **Why them:** initiatives are where petition firms earn most — 500k+ signature drives,
  corporate/union/advocacy-funded, recurring, year-round (not episodic like a presidential
  run). They have budgets *today* and an obvious ROI: the validation engine cuts the
  raw-to-valid ratio, so they qualify with fewer gathered signatures → underbid the firms.
- **Where to find them:** state initiative/referendum filings for the next cycle; the
  advocacy, union, and industry groups sponsoring measures; even the signature-gathering
  firms (as a tooling customer, not just a competitor).
- **Offer:** validation software that lowers their cost-per-valid-signature; the open data as
  the door-opener.

### 3. An election-data researcher / civic-tech org / data journalist  ← lead-gen + trust flywheel
- **Why them:** lowest-friction adopters. They amplify, cite, and — crucially — **surface
  errors**, which improves the data and builds the credibility the whole thesis rests on.
- **Where to find them:** election-law / political-science departments; civic-tech orgs
  (Democracy Works and similar); data journalists who cover ballot access and third parties.
- **Offer:** free, cited, machine-readable data that's genuinely hard to get elsewhere.

---

## The one-page pitch (archetype 1)

> **Get on the ballot in all 51 states — for under \$1M.**
>
> Ballot access is gated by 51 separate, constantly-changing rulebooks. We normalized all of
> them into **BallotAccessDB** — open, cited, machine-readable (free, yours today). On top of
> it we built the part that's hard: **real-time signature validation** (every signature
> checked against the voter file at capture, so you gather far fewer and submit clean) and an
> **optimizer** that routes volunteer effort to where a valid signature is worth the most.
>
> Together that's a 5–15× cut in the cost to qualify nationally — from the multi-million-dollar
> status quo toward **under \$1M**.
>
> We're looking for **one campaign to be state-zero** with us this cycle: you get the data and
> the tooling free; we get a real drive to prove and sharpen it on. *(Not legal advice; we
> confirm every rule with the Secretary of State before you file.)*

## Cold-outreach template

> Subject: open data for ballot access — and a way to qualify for under \$1M
>
> Hi [name] — I built **BallotAccessDB**, a free, open, cited dataset of every state's
> ballot-access rules (signatures, deadlines, circulator + pay rules, voter-file access),
> because the rules are public but impossibly scattered: [repo link].
>
> It's the foundation of something bigger — software that validates signatures in real time
> and routes gatherers so a serious independent/third-party run could qualify nationally for
> **under \$1M** instead of the usual multi-millions. [one-line on why you ↔ them.]
>
> Would a 20-minute call be worth it? Even if you just want the data, it's yours.

## Channels (sequence)

1. **Ship the repo** (public, polished — README/CONTRIBUTING/LICENSE done).
2. **Ballot-access community first** — Ballot Access News, third-party/independent forums.
   This audience *gets it* immediately and will stress-test the data.
3. **Show HN / r/datasets / r/thirdparty** — for the open-data + civic-tech crowd (archetype 3).
4. **Direct outreach** to 5–10 named targets across archetypes 1 & 2.

## Signal to watch (what we're actually buying with the launch)

| Signal | What it tells us |
|---|---|
| **Who replies first** (campaign vs committee vs researcher) | who the buyer is → product + entity decision |
| Inbound design-partner interest | is the "state-zero" model viable |
| Error reports / PRs | engagement depth + data improving + trust building |
| Which queries/states people ask about | where to deepen the data / which adapters next |
| Crickets from campaigns, interest from committees | confirms the red-team: the *recurring* buyer is initiatives, not presidential runs |

**The decision this unblocks:** once we know who shows up, the legal-entity + campaign-vs-company
structure (deferred for exactly this reason) becomes answerable — and so does which pilot states
and which 44 remaining adapters to build first.
