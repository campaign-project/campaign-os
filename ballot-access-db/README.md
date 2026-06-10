# BallotAccessDB

**The open knowledge graph of U.S. ballot-access rules.** All 51 jurisdictions —
signature requirements, filing deadlines, circulator & compensation rules, and how to
obtain each state's voter file — primary-source-grounded, machine-verified, versioned,
and queryable.

![license: ODbL-1.0](https://img.shields.io/badge/license-ODbL--1.0-1f6feb)
![jurisdictions: 51](https://img.shields.io/badge/jurisdictions-51-2ea043)
![citations: 557](https://img.shields.io/badge/citations-557-2ea043)
![verified: 2026-06](https://img.shields.io/badge/verified-2026--06-2ea043)

Getting a third-party or independent candidate on the ballot is gated by 51 separate,
constantly-shifting, badly-documented rulebooks. The rules are **public but scattered** —
so the durable work is normalizing them into one clean, cited, machine-readable graph.
That's this repo, and it's free for anyone: campaigns, ballot-initiative committees,
researchers, journalists, and other tools.

> ⚠️ **Not legal advice.** Records are verified by an automated, primary-source-grounded
> pipeline (no attorney sign-off), and many figures recompute every election cycle. Every
> record carries a `verifiedAsOf` date and a verification `gate` — treat `CONSERVATIVE-HOLD`
> and `BLOCKED` records as provisional and confirm with the Secretary of State / counsel
> before relying on them to file. See [LICENSE](./LICENSE).

## Get the data in 60 seconds

The dataset is plain JSON — use it from any language, no install.

```bash
# the whole dataset (51 jurisdictions, one array):
curl -sL https://raw.githubusercontent.com/campaignos/ballot-access-db/main/data/ballot-access-rules.json -o ballot-access.json

# one jurisdiction:
curl -sL https://raw.githubusercontent.com/campaignos/ballot-access-db/main/data/by-jurisdiction/OH.json

# which states have a free, instant-download voter file?
jq '[.[] | select(.voterFile.tier=="FREE_DOWNLOAD") | .abbr]' ballot-access.json   # → ["MS","NC","OH"]
```

```python
import json, urllib.request
B = "https://raw.githubusercontent.com/campaignos/ballot-access-db/main/data/ballot-access-rules.json"
rules = json.load(urllib.request.urlopen(B))
# cheapest + easiest to qualify: free voter file, ≤5,000 signatures, per-signature pay allowed
print([r["abbr"] for r in rules
       if r["voterFile"]["tier"] == "FREE_DOWNLOAD"
       and r["signatures"]["required"] <= 5000
       and r["compensation"].get("perSignatureAllowed") != "no"])
```

> Replace `campaignos/ballot-access-db` with the published repo path once live.

## What's here — and the open-core line

BallotAccessDB is the **open commons**: the *facts* of ballot access — what the rules are,
where they're written, when they were checked. It is deliberately **not** the proprietary
layer. The moat — *signature-validity intelligence by location × gatherer × format*, which
compounds per signature — is a separate, private asset. **Open facts, private intelligence.**
Publishing the facts widely is the mission and the lead-gen; the intelligence is the business.

## Dataset

- `data/ballot-access-rules.json` — all 51 canonical records (one array).
- `data/by-jurisdiction/<ABBR>.json` — one record per jurisdiction.
- `data/manifest.json` — version, schema ref, license, coverage stats, generated date.
- `schema/ballot-access-rule.schema.json` — JSON Schema (2020-12) every record conforms to.

### Record shape (data dictionary)

| Field | Meaning |
|---|---|
| `jurisdiction` / `abbr` | name / 2-letter code |
| `id` / `petitionType` | stable record id (`OH`, or `MI-ICA`) / petition type — `independent-presidential` (v1) or an initiative type (`initiated-constitutional-amendment`, …) added in v1.1 |
| `signatures.required` | controlling valid-signature count (recomputes per cycle for % states) |
| `signatures.headline` | verbatim verified basis (caps, distribution) |
| `deadline.headline` | verbatim verified filing deadline |
| `rules[]` | per-field verified rules — `{field, gate, value, confidence, note}` for signaturesRequired, deadline, distributionRule, circulatorEligibility, witnessOrNotary, captureMode, feeAlternative |
| `compensation` | `perSignatureAllowed` (yes/no/unaddressed), payMethod, circulatorResidency, operatingStance, gate |
| `voterFile` | acquisition: tier, cost, who-can-obtain, use restrictions, process, downloadUrl, layoutDocUrl, `verifiedAsOf` |
| `verification.gate` | **strictest** gate across fields — `AUTO-LIVE` / `CONSERVATIVE-HOLD` / `BLOCKED` (overall trust state) |
| `verification.sosInquiries` | count of open Secretary-of-State written inquiries on unsettled points |
| `citations[]` | primary-source `{field, url, quote}` backing the record |
| `provenance` | `verifiedAsOf`, method, source |

### Coverage (v1.1.0)

**115 records across 51 jurisdictions · 5 petition types** · **1,299 primary-source citations** · 134 open SoS inquiries.

- **51 independent-presidential** (the v1 graph) + **64 ballot-initiative / referendum** records:
  24 `initiated-statute` · 18 `initiated-constitutional-amendment` · 20 `veto-referendum` · 2 `popular-referendum`.
- Verification gate: 36 `AUTO-LIVE` · 76 `CONSERVATIVE-HOLD` · 3 `BLOCKED` (record-level = strictest field; per-field gates live in `rules[]`).
- Each initiative record carries the signature formula + current-cycle count, deadline, geographic
  **distribution**, single-subject rule, circulator residency, and per-signature-pay legality (the
  ~10 initiative per-sig-ban states are captured).

**Scope:** v1 = **independent-presidential** petitioning (51 jurisdictions). **v1.1** opens the
`petitionType` dimension and adds the **24 citizen-initiative states + DC**, researched by the same
primary-source → citation-grounding → conservative-gate pipeline. Mississippi's initiative process
is flagged `BLOCKED` (struck down by its Supreme Court in 2021). Next: remaining offices
(congressional / statewide candidate, recall) and per-cycle re-verification.

Initiative records are generated from the verification sweep into
[`initiative-rules.seed.json`](./initiative-rules.seed.json), which `build.ts` compiles + validates
alongside the presidential graph.

## Query API (for the JS/TS toolkit in this repo)

Three ways to use it, same data:

1. **Library** (`db.ts`): `get(idOrName)`, `query(filters)`, `stats()`, `schema()`.
2. **CLI** (`cli.ts`): `get` · `query` · `stats` · `endpoints` · `api` · `demo`.
3. **HTTP** — `handle(method, path, params)` is a request router; a server is a ~10-line wrapper:

| Endpoint | Maps to |
|---|---|
| `GET /v1/rules?perSignature=&voterFileTier=&freeVoterFile=&gate=&maxSignatures=&minSignatures=&residencyRequired=&q=` | `query(params)` |
| `GET /v1/rules/:id` (abbr or name) | `get(id)` |
| `GET /v1/stats` | `stats()` |
| `GET /v1/schema` | `schema()` |

```bash
node --experimental-strip-types cli.ts demo                 # query demo / selftest (Node ≥ 22.6)
node --experimental-strip-types cli.ts query --free --max-sig=5000
node --experimental-strip-types cli.ts api GET /v1/rules --per-sig=no
node --experimental-strip-types build.ts                    # rebuild + schema-validate the dataset
```

## Provenance & trust

Each record was produced by a no-counsel verification pipeline: multi-agent research →
deterministic citation-grounding (the quoted text must actually appear at the cited URL) →
adversarial review → a conservative tiered gate. **When uncertain, the strictest
interpretation wins** — uncertainty costs effort, never ballot access. Figures recompute
each cycle; confirm `CONSERVATIVE-HOLD` / `BLOCKED` records, and anything past its
`verifiedAsOf` window, before filing.

## Contributing

Found a stale figure, a better primary source, or a rule we got wrong? See
[CONTRIBUTING.md](./CONTRIBUTING.md) — the bar is **primary-source citations and the
conservative-gate principle**, the same standard the dataset is built to.

## License

Open Database License ([ODbL 1.0](./LICENSE)). Attribute *"BallotAccessDB / CampaignOS"*,
keep the provenance intact, and share adaptations alike.
