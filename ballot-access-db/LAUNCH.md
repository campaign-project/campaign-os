# Introducing BallotAccessDB — the open knowledge graph of U.S. ballot access

*Draft announcement. Adapt for a blog post, Show HN, or the repo. ~600 words.*

---

In the United States, getting a candidate on the ballot is not one rule. It's **51 separate
rulebooks** — fifty states plus D.C. — each with its own signature requirement, filing
deadline, distribution formula, circulator eligibility, notarization quirk, and compensation
law. The numbers recompute every election cycle. The authoritative sources are scattered
across statutes, Secretary-of-State PDFs, and price lists that change without notice.

This complexity is not an accident. It is the **single most effective barrier protecting the
two-party system** — and it works precisely *because* it's tedious, fragmented, and expensive
to navigate. A major party has it handled by default. An independent or third-party candidate
has to rebuild that knowledge from scratch, every cycle, in every state, usually by paying
firms \$1–\$15+ per valid signature and lawyers to interpret the rules.

The rules themselves are public. They're just **scattered**. So the hard, durable, valuable
work is the most boring-sounding thing imaginable: *normalizing them into one clean, cited,
machine-readable graph.*

That's **BallotAccessDB**, and today it's open.

## What it is

A free, versioned, machine-readable dataset covering all 51 jurisdictions for independent
presidential petitioning:

- **what** the rule is — signatures required, deadline, distribution, circulator rules,
  per-signature-compensation legality, and how to obtain each state's voter file;
- **where** it's written — **557 primary-source citations**, each with the exact quoted text;
- **how sure** we are — every record carries a verification gate (`AUTO-LIVE` /
  `CONSERVATIVE-HOLD` / `BLOCKED`) and a `verifiedAsOf` date, and **when in doubt it takes the
  strictest reading**, so the data never quietly over-promises.

It's plain JSON with a JSON Schema and a small query API. You can `curl` it and use it from any
language in about a minute.

## Why open

Because the facts of ballot access should belong to everyone running for office, not to whoever
can afford to assemble them. Publishing this widely is the point: it lowers the barrier for
every candidate, every initiative committee, every researcher and journalist trying to
understand how access actually works.

We draw a clear line. **The facts are open. The intelligence is not.** Which signatures
actually survive review — by location, by gatherer, by capture format — is a separate, private
asset that only accrues by doing the work. BallotAccessDB is the open commons; that
intelligence is how the tooling on top of it sustains itself. Open facts, earned intelligence.

## The bigger goal

BallotAccessDB is the foundation of a thesis: that with normalized rules, real-time signature
validation, and smart routing of volunteer effort, **a serious independent or third-party
candidate could qualify for the ballot in all 51 jurisdictions for under \$1 million** — a
5–15× cut from what it costs today. The database is step one: you can't optimize access you
can't even see clearly.

## Use it, break it, improve it

- **Grab the data:** [README → Get the data in 60 seconds](./README.md).
- **Found something stale or wrong?** That's the most valuable contribution — see
  [CONTRIBUTING.md](./CONTRIBUTING.md). The bar is primary sources, quoted.
- **Building something with it** — a campaign, an initiative, a tool, a study? We'd love to
  hear what you need next, and we're looking for a few design partners to qualify with.

It is **not legal advice** — figures move every cycle; confirm with the Secretary of State
before you file. But it's a start, and it's yours.

*BallotAccessDB / CampaignOS · Open Database License (ODbL 1.0)*
