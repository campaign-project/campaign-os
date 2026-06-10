# Voter-File Lawful Basis for Self-Serve — Pressure Test

**Status:** internal analysis to brief counsel · drafted 2026-06-08
**Not legal advice.** This is an engineering/strategy memo identifying the questions and a defensible posture. Every state-specific claim below is marked *to confirm* and must be reviewed by an election-law attorney before real voter data is used.

**The question:** Can an operator lawfully obtain state voter files and provide *match-as-a-service* (validity verdicts) to individual circulators who are **not** formally affiliated with a registered committee — i.e., does the self-serve / PLG model in [`GATHER_SELF_SERVE_GTM.md`](./GATHER_SELF_SERVE_GTM.md) clear the legal gate, or does it force us back to partnerships?

**Short answer:** Pure "anyone, anywhere, zero connection to any campaign" is **probably not clean** in many states, because *who may obtain the file* and *what it may be used for* are tied to electoral actors and electoral purposes — not open to the general public for arbitrary services. **But** a narrower model — *self-serve for circulators of campaigns the operator is authorized to support, in states where the operator can qualify, with a verdict-only / no-PII-egress architecture* — preserves essentially all of the PLG benefits and is defensible. **Self-serve is shaped by this, not blocked by it.**

---

## Why this — not partnerships — is the real gate

Partnerships were never legally required to *help a circulator*; the binding artifact is wet-ink paper the circulator turns in regardless. The thing that actually requires lawful authority is **holding and querying the voter file** that powers the validity prediction. So the constraint isn't "do we have a deal" — it's "do we have lawful basis for the data." Get that right and self-serve is open; get it wrong and it's criminal in some states (below).

## How voter-file law actually works — four levers

State voter-file statutes generally regulate four distinct things. Our model must clear all four:

1. **Requester eligibility — *who may obtain the file.*** States vary widely. Some sell to essentially anyone for a fee; many restrict to **registered voters, candidates, parties, committees, political/scholarly/journalistic/governmental requesters**, often with a signed purpose attestation. *The crux for us:* can the **operator** (a company) qualify as an eligible recipient in a given state — directly, or only via an electoral actor?
2. **Permitted purposes — *what it may be used for.*** Commonly limited to **election, political, governmental, scholarly, or law-enforcement** purposes. **Petition circulation is a core electoral purpose** and is typically permitted. Verifying that a petition signer is a registered, active, in-jurisdiction voter is *the Secretary of State's own check* — running it early is squarely an electoral use.
3. **Prohibited uses — *the bright-line "nots."*** Near-universal bans on **commercial use** and **commercial solicitation / advertising**, sometimes on **harassment** uses. A paid SaaS that happens to support electoral activity sits near this line and must be structured so the *use* is electoral, not "selling voter data."
4. **Redistribution — *can recipients pass the data on.*** Frequently restricted or barred. **This is where architecture saves us** (next section): we never redistribute the file.

> Misuse is **criminal** in several states. Example (illustrative; not a sandbox state): **California Elec. Code § 18109** makes using voter registration info for non-permitted purposes a crime. Treat the file as radioactive: lawful basis per state, no exceptions.

## The architecture that minimizes exposure (already how the app works)

Our design (RFC-002) is, by luck and intent, the low-exposure posture:

- **Operator holds the file; the circulator never receives it.** The device gets a *derived, minimized* per-geography index (normalized name + house# + status), not the raw file — and even that can be replaced by a **server-side verdict API** where a state's terms demand it.
- **Verdict-only output.** The user sees `COUNTS / NEEDS REVIEW / WON'T COUNT` (+ a matched name to confirm the *signer's own* stated identity), **not** bulk PII and **not** other voters' records. We are answering a verification query for an electoral purpose, not handing out the database.
- **Minimization + TTL + encryption** on any on-device index; **no redistribution**; **audit log** of queries.
- **Purpose binding:** queries are scoped to an active petition for a real measure (the campaign the circulator picked).

This reframes the legal question from *"can we redistribute voter files to the public"* (likely no) to *"can the operator, under a permitted electoral purpose, answer registration-verification queries for petition circulation"* (much stronger — this is the SoS's own check).

## The core question, reframed

> Can the **operator** (a) qualify as an **eligible recipient** of the file in state X, and (b) is **"verification-as-a-service for petition circulation"** a **permitted electoral use** rather than a prohibited **commercial use / redistribution**?

Two viable postures, depending on each state's requester-eligibility rule:

- **Operator-direct.** Where the state permits a company to obtain the file for electoral/petition purposes under attestation, the operator qualifies directly. Cleanest; most "permissionless" for the circulator.
- **Authorized-vendor (the "thin tie").** Where eligibility is limited to electoral actors (candidate/party/committee), the operator obtains/uses the file **as an authorized vendor of the specific campaign(s)** it lists. This is a *lightweight authorization* (a vendor/support letter), **not** an enterprise sales motion — the circulator still just downloads and picks a campaign. PLG intact; lawful basis explicit.

Either way the per-state answer turns on requester-eligibility (lever 1) and the commercial-use line (lever 3).

## The free-file sandbox (OH / OK / WA) — *to confirm with counsel*

We start where cost is zero and drag is least (see [`VOTER_FILE_ACQUISITION.md`](./VOTER_FILE_ACQUISITION.md)). Free file ≠ unrestricted use — confirm each:

- **Ohio** — statewide voter file is broadly downloadable; **confirm**: permitted-use scope for a verification service, any commercial-use limits, redistribution terms, attestation requirements.
- **Oklahoma** — **confirm**: requester eligibility (is the file open to a vendor, or only to specific electoral actors?), permitted purposes, and that hourly-paid circulation (per-sig restricted there) doesn't change the analysis.
- **Washington** — file broadly available; **confirm**: WA's commercial-use / no-solicitation restrictions and whether a verification SaaS is a permitted use or a prohibited commercial use.

For each: get the **terms of use / data agreement** the SoS attaches to the file, and have counsel map it to lever 1 (eligibility), 2 (purpose), 3 (commercial line), 4 (redistribution).

## Mitigations / design rules (make these invariant)

1. **Verdict-only egress** — never return bulk PII or third-party records to the device/user; prefer a server-side verify API where terms require.
2. **Minimize the on-device index** — derived fields only, encrypted, TTL'd, routing-bounded.
3. **No redistribution** — contractually and technically; the file never leaves the operator.
4. **Purpose-bind every query** — to an active, real petition (the picked campaign).
5. **Per-state gating** — a state is **dark** until counsel signs off on its data terms; the app must enforce this (no campaign in a non-cleared state goes live with real data).
6. **Authorized-vendor tie where required** — light-touch authorization per campaign; logged.
7. **Attestations + audit** — honor SoS use attestations; keep a query audit trail.
8. **Synthetic until cleared** — the prototype uses synthetic data; real data only behind the gate.

## Go / No-Go gating checklist (per state, before real data)

- [ ] Obtained the SoS file **terms of use / data agreement**.
- [ ] Counsel confirms **operator eligibility** (direct or via authorized-vendor).
- [ ] Counsel confirms **petition-verification is a permitted purpose**.
- [ ] Counsel confirms **verdict-only SaaS is not prohibited "commercial use."**
- [ ] **Redistribution** posture confirmed (we don't; verify our derived-index/verdict model complies).
- [ ] **Criminal-misuse statute** reviewed; controls in place.
- [ ] Per-state **kill-switch** wired (state stays dark until all boxes checked).

## Questions for counsel

1. In OH / OK / WA, can a **company** obtain the statewide voter file for **petition-verification** purposes, or only an electoral actor (forcing the authorized-vendor model)?
2. Is **verdict-only verification-as-a-service** a *permitted electoral use* or a *prohibited commercial use* in each?
3. Does our **derived per-geography index** on the device count as prohibited **redistribution**, or is a **server-side verify API** required?
4. What **attestations / agreements** must the operator (and/or each campaign) sign, and do they permit serving *individual circulators*?
5. Any state where **paid** circulation (vs. volunteer) changes the data-use analysis?

## Bottom line

Self-serve survives the pressure test — **provided the operator carries lawful basis for the file (direct or authorized-vendor) and the system is verdict-only / no-PII-egress / per-state-gated.** The only concession to "totally permissionless" is that the operator may need a *thin* authorization tie per campaign in eligibility-restricted states — which is a footnote to the circulator, not a partnership sales motion. Start in OH/OK/WA, synthetic until counsel clears each, and the PLG flow holds.
