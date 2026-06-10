# Machine-Verified StateBallotRule — California (pipeline output)

**Produced by `pipeline.ts` with NO human counsel.** Stack: deterministic citation grounding
(short-circuit) → real consensus/adversarial agent judge → tiered gate → conservative fail-safe.
Generated 2026-06-06 · cycle figures are 2024 (recompute per cycle). This is an illustrative
end-to-end run, not legal advice.

## Gate result

| field | gate | what the optimizer uses | conf | basis |
|---|---|---|---|---|
| signaturesRequired | 🟢 AUTO-LIVE | 219,403 (1% of statewide registration) | 0.96 | grounded vs SoS **PDF** (pdftotext); Elec. Code §8400 |
| validationModel | 🟢 AUTO-LIVE | random sample; full count if 90–110% | 0.98 | grounded vs §8401; judge confirmed nomination-band (not §9115 95–110%) |
| circulatorEligibility | 🟢 AUTO-LIVE | 18+; circulator need not be a registered voter | 0.95 | grounded vs §102/§8451; judge resolved SoS-guide conflict to statute (SB 213) |
| witnessOrNotary | 🟡 CONSERVATIVE-HOLD | **assume NOTARIZATION required** (strictest) until SoS confirms | 0.88 | grounded vs §8409, but CCP §2015.5 perjury-declaration substitution is unsettled |
| captureMode | 🔴 BLOCKED | (none — excluded) | — | citation fabricated → NOT_FOUND; LLM judging skipped |

**Summary:** 3 auto-live · 1 conservative-hold · 1 blocked. LLM judging was skipped for the 1 blocked
field (cost saved, integrity enforced early). The held field degrades to *over-compliance* (assume the
stricter notarization), never to a guess — exactly the no-counsel fail-safe.

## Escalation queue — authority of last resort

One field needs an answer retrieval can't give. The system drafts the written inquiry to the election
authority (free, authoritative); the answer is logged as `verifiedBy: sos-inquiry`.

> **To:** California Secretary of State, Elections Division
> **Re:** Circulator affidavit on independent presidential nomination papers — Elec. Code §§ 8407–8409
>
> For an independent presidential candidate's nomination papers, does the circulator's affidavit
> required by Elections Code §§ 8407–8409 have to be **notarized** (sworn before a notary or other
> officer authorized to administer oaths), or is an **unsworn declaration under penalty of perjury**
> (Code of Civil Procedure § 2015.5) accepted by county elections officials in lieu of notarization?
> If a perjury declaration is accepted, is there an official form or guidance we should follow?
>
> We are building volunteer petition workflows and want to comply with the strictest applicable
> requirement; we are currently instructing circulators to have each section **notarized**.

Until answered, the optimizer treats `witnessOrNotary` as **notarization required** and routes a notary
into the signing flow.

## Provenance

- Grounding: `ground.ts` (Node→wick→pdftotext fetcher; verbatim match, normalization-robust).
- Judge: four independent `general-purpose` agents (one per surviving field), each doing fresh
  primary-source re-derivation + adversarial refutation; verdicts in `judgements.ca.json`.
- Gate: `pipeline.ts` Stage 3 (deterministic).
- Reproduce: `node --experimental-strip-types pipeline.ts rule.ca.draft.json --judge=judgements.ca.json`
