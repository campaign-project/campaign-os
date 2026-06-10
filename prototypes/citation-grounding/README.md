# Citation-Grounding Checker (prototype)

The deterministic verification layer from [`BALLOT_ACCESS_OPTIMIZATION_PLAN.md`](../../BALLOT_ACCESS_OPTIMIZATION_PLAN.md)
§5.5 (layer 3). It answers exactly one question, with **no LLM judgment**:

> **"Does this exact quoted text actually appear at this URL?"**

It catches the *citation-integrity* failure mode — fabricated quotes, altered quotes, dead links —
which is the cheapest and most dangerous way an automated rules pipeline goes wrong when there is no
human counsel to notice. Because the verdict is a string match against fetched bytes, the checker
**cannot hallucinate its own result.**

## Scope (important boundary)

This layer verifies a citation is **faithfully reproduced from its source**. It does **not** judge
whether the quote *semantically supports* the claimed field value — that is the job of the consensus /
adversarial layers (§5.5 layers 1–2). Keeping the boundary sharp is what makes this layer
deterministic and trustworthy.

## Verdicts → gate

| verdict | meaning | §5.5 gate action |
|---|---|---|
| `GROUNDED` (✓) | quote found verbatim (after normalization) | eligible for **AUTO-LIVE** |
| `PARTIAL` (≈) | quote materially present but altered (dropped/changed words) | **REVIEW** wording, then auto-live |
| `NOT_FOUND` (✗) | quote not at source — possible fabrication / wrong URL | **BLOCK** the field — integrity failure |
| `UNREACHABLE` (∅) | could not fetch (block / timeout / PDF) | **RE-FETCH** with a browser-grade fetcher before trusting |

Process exit code: `1` if any `NOT_FOUND` (CI-gateable integrity failure), `2` if any `UNREACHABLE`,
else `0`.

## Run (Node ≥ 22.6, zero install)

```bash
# offline — proves the matcher deterministically (no network)
node --experimental-strip-types ground.ts --selftest
#   → 5/5 matcher cases passed

# live — fetch + ground a set of citations (auto fetcher: node → wick → pdftotext)
node --experimental-strip-types ground.ts citations.sample.json

# PDF + browser-grade demo (grounds a primary SOS PDF; shows honest UNREACHABLE)
node --experimental-strip-types ground.ts citations.pdf-demo.json

# force a specific fetcher
node --experimental-strip-types ground.ts citations.sample.json --fetcher=node   # auto | node | wick
```

`citations.sample.json` is an array of `{ id?, field?, url, quote }`. Drop in the `sources[]` from any
`StateBallotRule` record to grade it. Each result reports a `via=` tag (node / wick / pdftotext)
showing which fetcher resolved it.

## What it does (and how it's robust)

1. **Normalize** both quote and fetched text (NFKC, fold smart quotes/dashes/NBSP, lowercase, collapse
   whitespace) — so a *correct* citation isn't failed over a curly apostrophe or a double space.
2. **Exact substring** after normalization → `GROUNDED` (score 1.0).
3. Otherwise **fuzzy**: word-bigram Dice + asymmetric quote-containment over a sliding window
   (quote-length and quote-length+3), anchored on the rarest quote token so it stays fast on long
   statute pages. `≥0.97` → GROUNDED, `≥0.75` → PARTIAL, else NOT_FOUND (thresholds are constants).
4. **Cost-ordered fetcher escalation** (behind the one `Fetcher` seam):
   - HTML: fast Node `fetch` (browser UA + HTML→text) → on failure, escalate to the **wick** CLI
     (browser-grade: JS, Cloudflare, UA-blocks).
   - PDFs: download bytes → **poppler `pdftotext`** → fall back to wick's own extraction.
   - Genuinely hard sources (interactive CAPTCHA, dead host) stay `UNREACHABLE` by design.

## Demonstrated results

`--selftest` (offline): 5/5 — verbatim w/ `&nbsp;`+curly punctuation → GROUNDED; smart-quote/case/
whitespace variant → GROUNDED; dropped-words near-quote → PARTIAL (0.86); **fabricated quote →
NOT_FOUND (0.00)**; dead link → UNREACHABLE.

`citations.sample.json` (live): 5 GROUNDED (Colorado public.law ×3, California FindLaw, Arizona
azleg.gov), **1 NOT_FOUND — a planted fabricated quote** → `GATE: FAIL`. Note: FindLaw returns `403`
to `curl` but the browser-ish User-Agent got through; the planted fabrication was caught.

`citations.pdf-demo.json` (live, browser-grade): the **California SOS PDF grounds the `219,403`
figure `via=pdftotext`** (primary-source PDF, previously uncitable-by-machine); the public.law page
grounds `via=node`; and the **CAPTCHA-walled Arizona SOS PDF stays `UNREACHABLE`** (tried node →
PDF-download → wick, all blocked) → `GATE: RE-FETCH`. Exactly the right mix: escalate where possible,
fail honestly where not.

## Pipeline — grounding as the short-circuit

`pipeline.ts` wires this checker into the §5.5 flow as the cheap, deterministic first stage:

```
STAGE 1  grounding (deterministic)  ──NOT_FOUND / no-ground──▶  BLOCKED  (LLM layers skipped)
   │ survivors
   ▼
STAGE 2  consensus + adversarial judge (LLM)      ← pluggable seam (mockJudge | agentJudge)
   ▼
STAGE 3  tiered gate → 🟢 AUTO-LIVE | 🟡 CONSERVATIVE-HOLD | 🔴 BLOCKED
```

```bash
node --experimental-strip-types pipeline.ts rule.ca.draft.json
```

Grounding is **necessary but not sufficient**: it kills fabricated citations for free, but the judge
still catches quotes that are *real yet stale/wrong* and values that hinge on *legal interpretation*.
That is why grounding runs as a short-circuit BEFORE the judge, not as a replacement for it.

Demonstrated (CA draft, 5 fields): 🟢 3 AUTO-LIVE (incl. `signaturesRequired` grounded against the
SOS **PDF** via pdftotext) · 🟡 1 CONSERVATIVE-HOLD (`witnessOrNotary` grounds, but flagged
interpretation → optimizer falls back to "assume notarization required") · 🔴 1 BLOCKED (`captureMode`
fabricated quote → NOT_FOUND → **LLM judging skipped**). The judge is a seam: the prototype ships a
deterministic `mockJudge`; production injects `agentJudge` (the consensus + adversarial subagents
already run against AZ/CA/CO).

## Production notes (porting out of prototype)

- **Browser-grade fetch + PDF text — DONE.** The fetcher escalates Node → wick (browser-grade) →
  `pdftotext` automatically. Remaining gaps stay `UNREACHABLE` by design: interactive CAPTCHAs
  (install `wick-captcha` to solve the AZ-style ones) and dead hosts (Denver was returning `http:000`).
  Swappable via `--fetcher=`; the `Fetcher` type is still the single seam.
- **Where it slots in**: research agent emits `StateBallotRule` with `sources[]` → **this checker
  grounds every citation** → consensus + adversarial layers judge *support* → tiered gate
  (AUTO-LIVE / CONSERVATIVE-HOLD / BLOCKED). A `NOT_FOUND` here short-circuits to BLOCK.
- **Home**: this belongs in `packages/ai` (the plan's "citation validation") or `packages/compliance`;
  it's a standalone prototype here so it runs without the monorepo build. When porting, replace the
  `which wick` / `execFile` shell-outs with the in-process wick client / a Node PDF lib.

## Limitations

- Verbatim-presence only — not semantic support (by design).
- Heavy paraphrase reads as `NOT_FOUND` (the checker enforces *verbatim* citation — a feature).
- Thresholds are heuristic; tune against a labeled set as real citations accumulate.
