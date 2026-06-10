# StateBallotRule — Sample Output (AZ · CA · CO)

**Companion to [`BALLOT_ACCESS_OPTIMIZATION_PLAN.md`](./BALLOT_ACCESS_OPTIMIZATION_PLAN.md) (RFC-001).**

This file is the concrete output of running the per-state research subagent (`StateRuleAgent`,
§5 of the plan) against three deliberately contrasting jurisdictions. It exists to (a) prove the
subagent pattern produces structured, source-cited rules, and (b) pressure-test the
`StateBallotRule` schema against messy real-world law.

> ⚠️ **STATUS: AI-generated DRAFTs, gated by automated verification (no human counsel).** The
> campaign has no attorney to sign off, so these records go live only through the **§5.5 layered
> automated verification + conservative fail-safe**: a field is trusted only when independent agents
> agree, citations ground, and computed numbers re-derive; anything conflicting, single-sourced, or
> interpretation-class is held at the **strictest** interpretation (over-comply) and, where it's a
> legal-interpretation question, escalated to the state election office in writing. Figures are
> 2024-cycle and **recompute every presidential cycle** — do not reuse the numbers for 2028. The
> adversarial verification results (below) show the gate working.

---

## Cross-state comparison (the optimizer's-eye view)

| field | Arizona | California | Colorado |
|---|---|---|---|
| access path (independent pres.) | Independent nomination petition (A.R.S. § 16-341) | Independent nomination papers — slate of 54 electors (Elec. Code § 8400) | Unaffiliated candidate petition (C.R.S. § 1-4-802) |
| **signatures (2024)** | **42,303** | **219,403** | **12,000** |
| basis (recomputes) | 3% of non-major-party registrants, measured Jan 2 | 1% of statewide registration | fixed floor: 1,500 per congressional district |
| **distribution rule** | none | none | **YES — 1,500 in each of 8 CDs** |
| deadline (2024) | Aug 17 (80–100 days before general) | Aug 9 (E-88) | Jul 11 (117th day before general) |
| **capture mode** | **paper** | **paper** | **paper** |
| digital system exists? | E-Qual — **but NOT for president** | none | Denver eSign — **municipal only** |
| circulator eligibility | 18+, qualified to register; **non-residents may circulate** (must register w/ SOS) | **18+** (voter-registration requirement disputed between two SOS docs) | US citizen, **18+, no residency** |
| **notary model** | none — circulator *certification* per sheet | form depicts notary; practice often perjury declaration (verify) | **notarized affidavit per section — hard filing gate** |
| validation model | voter-file + handwriting match; challenge-based | **random sample → full count if estimate is 90–110% of requirement** | SOS voter-file match; 5-day / 3-day cure windows |
| fee alternative | none | none (no fee for Presidential Elector) | none for the general-election unaffiliated path |
| **electors slate** | 11 (2024) | 54 (+54 alternates) | full slate required |
| **non-signature knockout gates** | VP consent, electors' nomination papers, acceptance letters | each elector's Declaration of Candidacy | notarized acceptance forms, SOS audio-recording rule |

**Read this table as three different optimization problems.** California is a brute-force scale
problem (collect ~330k+ raw to clear 219k valid through a random-sample-with-full-count gate).
Colorado is a *distribution* problem (you can't bank signatures in Denver — every one of 8 districts
needs 1,500, and every sheet needs a notary). Arizona is a *paperwork-discipline* problem (the
signature bar is modest, but a missing electors' form ends the run — as it did for a 2024 candidate).

---

## Record 1 — Arizona

## StateBallotRule — Arizona (AZ)
`verificationStatus: DRAFT — pending human counsel review`

| field | value | source # |
|---|---|---|
| jurisdiction | Arizona (statewide; filed with the Arizona Secretary of State) | [1][2] |
| accessPath | **(A) Independent / unaffiliated nomination petition** (A.R.S. § 16-341) — a qualified elector not a registered member of a recognized party, nominated "otherwise than by primary," files a nomination petition naming the VP running mate and a full slate of presidential electors. **(B) New/minor-party route** (§§ 16-801, 16-803) — first qualify a new party, then the party's nominee/electors appear via the party process. AZ bans cross-filing / "sore loser" (§ 16-341(B)). | [2][3][4] |
| signaturesRequired | **3%** of statewide registered voters who are NOT members of a qualified party. 2024 official figure = **42,303** valid signatures. (§ 16-341(E)) | [2][4][5][6] |
| signatureBasis | 3% of AZ registered voters affiliated with neither qualified party, measured **January 2 of the general-election year** (§ 16-341(F)). Recomputes each cycle. (New-party route instead = 1⅓% of last gubernatorial vote, § 16-801(A).) | [2] |
| deadline | Nomination petition filed **not less than 80 nor more than 100 days before the general** (§ 16-341(G)). 2024 = **Aug 17, 2024, 5:00 p.m.** | [2][3][4][6] |
| distributionRule | **None** for the independent presidential petition (flat statewide pool). The ≥5-county / small-county distribution rule applies only to *new-party recognition*. | [2][6] |
| circulatorEligibility | "Not required to be a resident … but otherwise must be qualified to register to vote in this state" (§§ 16-315(B)(2), 16-321(D)). **Non-resident circulators must register with the SOS** before circulating. | [2][7][8] |
| residencyRequired | **No** in-state circulator residency requirement (non-residents expressly permitted; must register + accept service of process). | [2][7][8] |
| witnessOrNotary | **No notarization** of candidate nomination sheets — circulator *certification* (sign each sheet, verify signatures in presence). (Notarized affidavits apply to initiative/referendum/recall, a different process.) | [2][7][8] |
| oneCountyPerSheet | **Yes (effectively)** — each sheet headed "qualified electors of ___ county"; out-of-county signatures struck. *Reviewer: confirm operational rule against current SOS petition guide.* | [2] |
| captureMode | **paper** | [2][9] |
| digitalSystem | **E-Qual** — https://apps.azsos.gov/equal/ (statewide & legislative) + federal-office portal (§§ 16-316/-317/-318). Exists, but NOT for president. | [9][10] |
| digitalScope | **CRITICAL: E-Qual does NOT cover an independent PRESIDENTIAL petition.** § 16-318(B) limits its section to US Senate/Representative; §§ 16-316/-317 cover statewide/legislative/county/municipal/PC offices; §§ 16-315(E) & 16-341(N) limit electronic petitions to "statewide and legislative offices." No authorization for President/presidential elector → **all signatures on paper.** | [2][9][10] |
| validationMethod | Voter-file / signature match by county recorders + SOS; "signature and handwriting comparisons may be made" (§ 16-321(D)); challenge-based review for candidate petitions. | [2][4][8] |
| feeAlternative | **None** — petition-only; no fee-in-lieu. (§ 16-341(M) fine-based bar is for state/local candidates, N/A to a presidential filer.) | [2] |
| confidence | **HIGH** on access path, 3% basis, Jan-2 date, 80–100-day window, paper-only, and digitalScope (3 converging statutes). **MEDIUM** on the exact 42,303 (sourced via AZ Republic quoting SOS; SOS PDFs were CAPTCHA-blocked) and the one-county-per-sheet operational rule. **Number recomputes each cycle — do not reuse 42,303 for 2028.** | [2][4] |

### Sources (Arizona)
- [1] AZ SOS — *Running for U.S. President in Arizona: A Candidate Guide* (2024) — https://azsos.gov/sites/default/files/docs/2024_running_for_president_handbook_20240309.pdf — (PDF CAPTCHA-blocked; cited via indexed description; effective 2024-03-09; retrieved 2026-06-06)
- [2] Arizona Revised Statutes, Title 16 (azleg.gov) — §§ 16-341, -314, -315, -318, -321, -801, -803 — https://www.azleg.gov/ars/16/00341.htm (and siblings) — § 16-341(E) 3% basis; § 16-341(F) "January 2"; § 16-341(G) "80…100 days before the general election"; § 16-318(B) "applies only to candidates for the office of United States senator or representative in Congress"; § 16-341(N)/§ 16-315(E) electronic petitions "for statewide and legislative offices." — (retrieved 2026-06-06)
- [3] NASS — *Summary: State Laws Regarding Presidential Ballot Access* (Jul 2024) — https://www.nass.org/sites/default/files/reports/summary-ballot-access-laws-president-072924.pdf — AZ: "no less than 80 days before … 3% of the registered independent voters … must include the names of the presidential electors." — (retrieved 2026-06-06)
- [4] Arizona Republic — "RFK Jr. submits 110K signatures …" (Aug 16, 2024) — https://www.azcentral.com/story/news/politics/elections/2024/08/16/kennedy-submits-signatures-for-arizona-ballot-west-missing-paperwork/74836226007/ — "must gather 42,303 signatures"; Aug 17 5 p.m. deadline; West disqualified for **missing presidential/VP nomination forms** (not signatures). — (retrieved 2026-06-06)
- [5] Ballot Access News — "Arizona SOS Corrects Misinformation …" (Jan 12, 2024) — https://ballot-access.org/2024/01/12/... — corrects the erroneous ~135,000 (3%-of-all-voters) figure. — (retrieved 2026-06-06)
- [6] Ballotpedia — *Ballot access requirements for presidential candidates in Arizona* — https://ballotpedia.org/Ballot_access_requirements_for_presidential_candidates_in_Arizona — (secondary cross-check; retrieved 2026-06-06)
- [7] AZ SOS — *Circulators* — https://azsos.gov/elections/ballot-measures/circulators — (retrieved 2026-06-06)
- [8] A.R.S. § 16-321 — https://www.azleg.gov/ars/16/00321.htm — circulator non-residency + verification + "handwriting comparisons." — (retrieved 2026-06-06)
- [9] AZ SOS — E-Qual portal info — https://qa.azsos.gov/apps/election/eps/op — office list per statute (President not included). — (retrieved 2026-06-06)
- [10] AZ SOS — E-Qual — https://apps.azsos.gov/equal/ — "Statewide and Legislative candidates." — (retrieved 2026-06-06)

**Flags:** number recomputes (don't reuse 42,303); avoid the ~135,000 error (3% of *non-major-party* voters, not all); distribution rule belongs to new-party not independent; **non-signature knockouts** (VP consent, electors' papers, acceptance letters) — a 2024 candidate failed on exactly these; SOS PDFs were CAPTCHA-blocked → reviewer must open them directly; electors slate = 11 (2024, tracks reapportionment).

---

## Record 2 — California

## StateBallotRule — California (CA)
`verificationStatus: DRAFT — pending human counsel review`

| field | value | source # |
|---|---|---|
| jurisdiction | California — general election, Office of President | [1][2] |
| accessPath | **(A) Independent nomination petition** (focus): qualify a slate of **54 Presidential Electors + 54 alternates**; nomination papers carry the signatures (Elec. Code §§ 8303, 8400, 8550). **(B) New/minor-party qualification** (§§ 5100, 5151): 2% of statewide vote, OR 0.33% registration, OR 10%-of-gubernatorial-vote petition. | [1][2][3][4][5] |
| signaturesRequired | **219,403** (2024). Basis: **1% of statewide registration** from the last Report of Registration before the Nov 2022 general (§§ 2187(c)(6), 8400). | [2][3][6] |
| signatureBasis | 1% of total statewide registration; **recomputes every cycle** — 219,403 is 2024 only. | [2][3][6] |
| deadline | **5:00 p.m. on E-88** (88th day before general). 2024 = **Aug 9, 2024**. Circulation opens E-193 (Apr 26, 2024). (§§ 8403(a)(2), 8550) | [2][3][6] |
| distributionRule | **None** (signatures delivered to signer's county — organizational, not a quota). | [2][3][6] |
| circulatorEligibility | **18+** (§§ 102, 8451). Statute imposes no separate registered-voter requirement; one SOS handbook section loosely says "registered voters of the state" — conflict flagged. | [1][2][3][7][8] |
| residencyRequired | Candidate: US constitutional qualifications. Each of 54 electors must be a registered CA voter. No circulator CA-residency requirement in statute (18+ only). | [1][2][3] |
| witnessOrNotary | **Circulator's Affidavit** per section. § 8409 form depicts a notarized affidavit ("Subscribed and sworn to before me … Notary Public (SEAL)"), but modern practice often uses a **declaration under penalty of perjury** — reviewer must confirm current county form. | [9] |
| oneCountyPerSheet | **Yes (effectively)** — each section headed "County of ___"; delivered to the county where signers reside. (§§ 8403, 8409) | [2][3][9] |
| captureMode | **paper** | [1][2][3][9] |
| digitalSystem | null | [1][2][3] |
| digitalScope | CA does **NOT** accept electronic/online petition signatures for presidential nomination papers. Wet-ink, circulator-witnessed, county-examined. | [1][2][3][9] |
| validationMethod | County officials examine signatures (§ 8400). **>500 sigs → MAY random-sample** (≥500 or 5%, whichever greater); **if estimate is 90–110% of the requirement → MANDATORY full count** (§ 8401; 2 CCR § 20530). | [2][3][10][11][12] |
| feeAlternative | **None needed** — "No filing fee is required to file as a Presidential Elector." (In-lieu-fee mechanism §§ 8106/8405 is moot for this office.) | [2][13] |
| confidence | **HIGH** on count, formula, deadline, paper-only, random-sample validation, no fee (direct from CA SOS sheet + Elec. Code + NASS). **MEDIUM** on circulator registered-voter-vs-18+ conflict and notary-vs-perjury-declaration. **219,403 is 2024 only.** | — |

### Sources (California)
- [1] CA SOS — *2024 California Election Guide* — https://www.sos.ca.gov/elections/prior-elections/statewide-election-results/pres-prim-march-2024/2024-california-election-guide — (retrieved 2026-06-06)
- [2] CA SOS — *Qualifications and Requirements — Presidential Elector, Independent Nomination, Nov 5 2024* (PDF) — https://elections.cdn.sos.ca.gov/statewide-elections/2024-general/president-elector-independent.pdf — "signed by at least 219,403 registered voters (equivalent to 1% of the statewide registration …) §§ 2187(c)(6), 8400"; "5:00 p.m. on August 9, 2024 (E-88) … § 8403(a)(2)"; "Circulators shall be 18 years of age or older. §§ 102, 8451"; "No filing fee is required …" — (retrieved 2026-06-06)
- [3] CA SOS — *Independent Candidates, Nov 5 2024* (Section 07) (PDF) — https://elections.cdn.sos.ca.gov/statewide-elections/2024-primary/section-07-independent-candidates.pdf — "219,403 … 1% of the statewide registration"; "qualifying a group of 54 Presidential Electors." — (retrieved 2026-06-06)
- [4] CA Elec. Code § 5100 (FindLaw, current Jan 1 2025) — https://codes.findlaw.com/ca/elections-code/elec-sect-5100/ — 2% / 0.33% / 10% tests. — (retrieved 2026-06-06)
- [5] Ballotpedia — *Ballot access requirements for presidential candidates in California* — https://ballotpedia.org/Ballot_access_requirements_for_presidential_candidates_in_California — (secondary; retrieved 2026-06-06)
- [6] CA Elec. Code § 8403 — https://codes.findlaw.com/ca/elections-code/elec-sect-8403/ — "no earlier than 193 days … no later than 5 p.m. 88 days before the election." — (retrieved 2026-06-06)
- [7] CA Elec. Code § 8451 — https://codes.findlaw.com/ca/elections-code/elec-sect-8451/ — "Circulators shall meet the requirements of Section 102." — (retrieved 2026-06-06)
- [8] CA Elec. Code § 102 — https://codes.findlaw.com/ca/elections-code/elec-sect-102/ — "18 years of age or older." — (retrieved 2026-06-06)
- [9] CA Elec. Code § 8409 — https://codes.findlaw.com/ca/elections-code/elec-sect-8409/ — circulator's affidavit form, "County of ___," "Subscribed and sworn to before me … Notary Public (SEAL)." — (retrieved 2026-06-06)
- [10] CA Elec. Code § 8401 — https://codes.findlaw.com/ca/elections-code/elec-sect-8401.html — random sample ≥500 or 5%; "90 to 110 percent … shall examine and verify each signature." — (retrieved 2026-06-06)
- [11] CA SOS — *Random Sampling Verification Methodology* (regs) — https://www.sos.ca.gov/administration/regulations/current-regulations/elections/election-petition-signature-verification-random-sampling-verification-methodology — (retrieved 2026-06-06)
- [12] 2 CCR § 20530 — https://www.law.cornell.edu/regulations/california/2-CCR-20530 — (retrieved 2026-06-06)
- [13] CA Elec. Code § 8405 — https://codes.findlaw.com/ca/elections-code/elec-sect-8405/ — in-lieu-fee signatures may count toward nomination paper. — (retrieved 2026-06-06)
- [14] NASS — *Presidential Ballot Access Summary* (Jul 2024), CA entry — https://www.nass.org/sites/default/files/reports/summary-ballot-access-laws-president-072324.pdf — "at least 1% of the entire number of registered voters … no later than 88 days before the election." — (retrieved 2026-06-06)

**Flags:** very large requirement → over-collect ~1.5–2× and aim **above 110%** to dodge the full-count band; number recomputes; circulator 18+-vs-registered-voter conflict; notary-vs-perjury-declaration; §5151 presidential-cycle deadlines differ from generic §5100; defeated primary candidate barred from independent run (§ 8301).

---

## Record 3 — Colorado

## StateBallotRule — Colorado (CO)
`verificationStatus: DRAFT — pending human counsel review`

| field | value | source # |
|---|---|---|
| jurisdiction | Colorado — filed with & verified by the CO Secretary of State (not counties) | [1][4] |
| accessPath | **(a) Unaffiliated candidate petition** (C.R.S. § 1-4-802) — names a joint President+VP ticket + elector slate (primary path). **(b) Minor-party path** — recognized minor party nominates by assembly/convention, or petitions. | [1][2][5] |
| signaturesRequired | **At least 1,500 valid signatures in EACH of 8 congressional districts = 12,000 total** (current SOS guidance). An older flat **5,000** figure persists in stale sources — superseded. | [4][2] |
| signatureBasis | Fixed statutory floor per CD: § 1-4-802(1)(c)(I) "at least one thousand five hundred in each congressional district for the office of president." Scales with CD count. | [2][3] |
| deadline | **3:00 p.m. on the 117th day before the general** (§ 1-4-802(1)(f)(I)). 2024 = **Jul 11, 2024**. Circulation opens 173rd day before the general. | [2][4][6] |
| distributionRule | **YES** — ≥1,500 per CD across all 8; signers must reside in the district where they sign (§§ 1-4-802(1)(c), 1-4-904). | [2][4] |
| circulatorEligibility | US citizen + **≥18** at time circulated (§ 1-4-905(1)). No voter-registration/party requirement. Paid vs volunteer badge required (§ 1-4-905(6)). | [3][1] |
| residencyRequired | Candidate: US constitutional qualifications. Circulator: **no CO-residency requirement** in § 1-4-905 (contrast the *initiative* statute § 1-40-112, a different petition type). | [3][7] |
| witnessOrNotary | **NOTARIZED circulator affidavit on EVERY section** (§ 1-4-905(2)(a)); notary must observe circulator **in person** (§ 1-4-905(2)(b)(I)); SOS **"shall not accept for filing any section … which does not have attached … the notarized affidavit"** (§ 1-4-905(3)). | [3] |
| oneCountyPerSheet | No one-county-per-section rule for candidate petitions; binding constraint is **one CD per signer eligibility** + one circulator affidavit per section. | [2][3] |
| captureMode | **paper** — SOS pre-approves printed format (§ 1-4-903); in-presence collection; per-section notarized affidavit. | [3][4] |
| digitalSystem | **Denver eSign** — city-run tablet app (Denver Rule 12), **municipal petitions only**. Does NOT apply to statewide/presidential. | [8][9] |
| digitalScope | **NO** Colorado digital system covers statewide/presidential petitions. Digital (Denver eSign) is confined to Denver municipal petitions — an explicit **intra-state capture-mode split**. | [8][9][4] |
| validationMethod | SOS verifies against statewide voter registration; **cure windows**: 5 days (defective circulator affidavit), 3 days (signer signature mismatch). Sufficiency statement; 5-day protest window (§§ 1-4-908/-909/-912). | [4][2] |
| feeAlternative | **None** for the unaffiliated general-election path. (The $500-fee/statement-of-intent/5,000-sig mechanism is the separate presidential *primary* path — NASS conflates them; flagged.) | [4][10][1] |
| confidence | **MEDIUM-HIGH** on petition mechanics (count, notarized affidavit, 117-day deadline, paper, Denver eSign scope) — confirmed vs current SOS + C.R.S. Title 1. **MEDIUM** on signature presentation & fee alternative (stale secondary figures). | — |

### Sources (Colorado)
- [1] CO SOS — *Unaffiliated Candidate Petition Nomination (General) — President & VP* — https://www.coloradosos.gov/pubs/elections/Candidates/UnaffiliatedPetitionPVP.html — "citizen … at least 18 years of age"; "117th day … before the general election." (**STALE** — shows "5,000" + 2020 dates; superseded by [4]). — (retrieved 2026-06-06)
- [2] C.R.S. § 1-4-802 (public.law, current through Fall 2025) — https://colorado.public.law/statutes/crs_1-4-802 — "(c)(I) At least one thousand five hundred in each congressional district for the office of president"; "(f)(I) … 3 p.m. on the one hundred seventeenth day before the general election"; "(d)(I) … not … earlier than one hundred seventy-three days before the general election." — (retrieved 2026-06-06)
- [3] C.R.S. § 1-4-905 (public.law) — https://colorado.public.law/statutes/crs_1-4-905 — "(1) … citizen of the United States and at least eighteen years of age"; "(2)(a) … signed, notarized, and dated affidavit …"; "(2)(b)(I) … circulator is in the physical presence of the notary public …"; "(3) … shall not accept for filing any section … which does not have attached … the notarized affidavit." — (retrieved 2026-06-06)
- [4] CO SOS — *Petition Nomination: For President & Vice President* (current) — https://www.coloradosos.gov/pubs/elections/Candidates/PresidentPetition.html — "at least 1,500 signatures in each of the 8 congressional district (12,000 total)"; "117th day before the general election"; cure windows. — (retrieved 2026-06-06)
- [5] CO SOS — *Unaffiliated Candidate Petition* hub — https://www.sos.state.co.us/pubs/elections/Candidates/UnaffiliatedPetition.html — (retrieved 2026-06-06)
- [6] Ballotpedia — *Ballot access requirements for presidential candidates in Colorado* — https://ballotpedia.org/Ballot_access_requirements_for_presidential_candidates_in_Colorado — (secondary; **stale 5,000 figure**; used only for 2024 deadline + 117-day rule). — (retrieved 2026-06-06)
- [7] C.R.S. § 1-40-112 (FindLaw) — https://codes.findlaw.com/co/title-1-elections/co-rev-st-sect-1-40-112/ — initiative-circulator residency (cited only to CONTRAST; not applicable to candidate petitions). — (retrieved 2026-06-06)
- [8] U.S. EAC — *eSign – Electronic Signature Image Gathering Network (Denver, CO)* — https://www.eac.gov/sites/default/files/eac_assets/1/6/Denver_CO-eSign.pdf — "first-in-the-nation mobile petition signing application" (municipal). — (retrieved 2026-06-06)
- [9] City & County of Denver — *Rule 12. Digital Petition Application* (2025) — https://www.denvergov.org/files/assets/public/v/1/clerk-and-recorder/documents/operations-division/compliance/2025/rule-12.pdf — "those persons seeking to submit **municipal** petitions …" (Denver server timed out 2026-06-06; quoted via SOS-search snippet — reviewer to re-pull). — (retrieved 2026-06-06)
- [10] NASS — *Presidential Ballot Access Summary* (Jul 2024), CO entry — https://www.nass.org/sites/default/files/reports/summary-ballot-access-laws-president-072424.pdf — lists "5,000 … 90th day … $500 fee" (**conflicts with current SOS [4] + statute [2]**; flagged for counsel). — (retrieved 2026-06-06)

**Flags:** notarized affidavit per section is a hard gate + the most common knockout; per-CD distribution means you can't bank signatures in one metro; **5,000-vs-12,000 conflict** across NASS/Ballotpedia/old SOS page vs. current SOS — exactly why human verification exists; confirm CD count for the cycle; additional gates (elector slate, notarized acceptance forms, SOS audio-recording rule § 4.6.1).

---

## What running it on three states taught us (schema feedback)

Real law broke assumptions. These lessons are folded back into the plan's `StateBallotRule` schema
(§5.2) and the optimizer:

1. **`digitalScope` is load-bearing — Arizona proved it.** "Digital state" ≠ digital for *this* race.
   E-Qual exists but excludes President. The optimizer must read scope, never the headline.
2. **Signatures are not the only failure mode.** A 2024 candidate was knocked off Arizona's ballot for
   **missing electors' paperwork**, not signatures. The schema needs an explicit
   `filingGatesBeyondSignatures[]` (VP consent, electors' nomination papers, acceptance letters,
   CO's notarized acceptance forms + audio-recording rule) — and the optimizer must track these as
   hard gates with their own deadlines.
3. **Distribution rules are first-class.** Colorado's per-CD floor means marginal value must be
   computed **per congressional district**, not per state — you can be "done" statewide and still fail.
4. **Validation model drives buffer policy.** California's random-sample-that-escalates-to-a-full-count
   in the 90–110% band means the target isn't "100% + a little" — it's **comfortably above 110%**.
   `recommendedBuffer` must be derived from the jurisdiction's actual `validationModel`.
5. **Notary model is a field-logistics input.** None (AZ) vs. notarized-per-section (CO) vs. ambiguous
   (CA) changes whether a **notary must be routed into the signing flow** — a real constraint the
   assignment engine must respect.
6. **Secondary sources are dangerously stale.** Colorado's "5,000" lives on in NASS, Ballotpedia, and
   even an old SOS page, while the current rule is "12,000 (per-CD)." This is the entire justification
   for **primary-source-first research + human verification + per-cycle re-runs.**
7. **Every number recomputes per cycle** (3% of non-major-party regs · 1% of registration · per-CD
   floor × CD count). The schema stores the **basis formula**, not just the number; 2024 figures are
   illustrative only.

---

## Adversarial verification results (independent re-pull, no human counsel)

Each DRAFT was then run through a `StateRuleValidationAgent` (§5.5) — a separate, default-skeptical
agent given only the *claimed values*, not the first agent's sources, and told to **refute**. This is
the automated stand-in for counsel.

| state | gate | what the adversarial reviewer found |
|---|---|---|
| **Arizona** | `RETURN_TO_RESEARCH` | Numbers confirmed — and it found a *better* primary source (the official SOS signature table) for 42,303. Caught three things: the official SOS **handbook itself misstates the legal basis** ("3% of registered voters" vs. the statutory "3% of non-qualified-party registrants"); the 2024 deadline **falls on a Saturday with no stated rollover** (interpretation → SOS inquiry); and the draft's **"one-county-per-sheet" rule has no statutory support** → dropped. |
| **California** | `RETURN_TO_RESEARCH` | 219,403 confirmed and **independently recomputed** (21,940,274 × 1% = 219,403). Circulator conflict resolved to the controlling statute (**18+ controls**; the SOS §07 guide is wrong). The **notary-vs-perjury-declaration question is genuine legal interpretation** — *not* in the code → must be held conservative + SOS inquiry. Added a missed cite (§8407). |
| **Colorado** | `PASS` | **12,000-per-CD confirmed; the stale 5,000 debunked** by tracing it to its origin — the presidential-*primary* statute § 1-4-1204(c). 8 congressional districts confirmed; per-section notarization confirmed; the fee path was **repealed by SB21-250**. Only gap: the Denver Rule 12 PDF was unreachable. |

**How this maps onto the §5.5 tiered gate (no counsel):**

- Colorado's confirmed fields → **AUTO-LIVE** (primary-sourced, consensus, recompute-matched).
- Arizona's deadline-rollover and California's notary question → **CONSERVATIVE-HOLD**: the optimizer
  uses the strictest reading (assume the deadline does *not* roll; assume notarization *is* required)
  and the system drafts a written inquiry to the AZ / CA election office.
- The Colorado Denver-Rule-12 field and any other unreachable source → **BLOCKED**: the optimizer does
  not rely on it until re-pulled.
- Arizona's "one-county-per-sheet" → **deleted** (no statutory support).

This is the verification model working end-to-end **without a lawyer**: real errors caught (including a
*primary source* being wrong), genuine interpretation questions isolated and routed to the authority
that can answer them, and everything uncertain defaulting to over-compliance instead of a confident
guess.
