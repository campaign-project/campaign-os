# CampaignOS Expanded Plan

## Purpose

CampaignOS is an open-source, AI-native operating system for political campaigns. The initial focus is the national presidential campaign — built end-to-end for that use case first — on a multi-tenant architecture designed to expand to congressional, state, local, ballot-initiative, nonprofit, and advocacy campaigns over time.

**Initial scope:** start with presidential campaigns. Everything in this plan is prioritized to make a presidential campaign fully operational first; down-ballot and advocacy use cases are explicitly deferred until the presidential experience is proven.

The product goal is not to clone existing campaign software one module at a time. The goal is to let a focused core team stand up a complete, credible presidential campaign in a single afternoon — and then operate it with capabilities that used to require large staffs and expensive consultants.

Speed and ease are the headline. Source-backed policy, volunteer activation, CRM, compliant workflows, and AI assistance all ship as one shared operating layer you can launch fast — not a kit of parts you assemble over six weeks.

The first release should prove:

- A focused team can launch a full presidential campaign — public site, policy, volunteers, events, donations — in hours, not months.
- Supporters can become useful volunteers within minutes of signing up.
- AI accelerates the daily work — drafting, summarizing, organizing, field scripts — while staying source-backed and accountable by default.

## Product Thesis

Campaign software is usually fragmented across website tools, volunteer tools, donor tools, policy docs, spreadsheets, CRMs, and consultants. That fragmentation creates coordination costs that small campaigns cannot absorb.

The cost of that fragmentation is mostly *time*: weeks of tool selection, integration, and duplicate data entry before a campaign can do anything at all. CampaignOS collapses that to a single fast setup, so a campaign is operational on day one.

CampaignOS should become the shared operational spine:

- Public-facing trust: policy, sources, events, signup, AI assistant.
- Internal execution: CRM, volunteers, missions, content, approvals, audit logs.
- Regulated operations: fundraising warnings, ballot-access tracking, consent, exports.
- AI assistance: drafting, summarization, classification, retrieval, volunteer scripts, but always constrained by approved sources and human review.

## Target Users

### Campaign Manager

Owns the whole operation: priorities, staff coordination, budget, vendors, deadlines, legal exposure, and daily execution. Needs to know what matters today, what is falling behind, and who owns each risk.

### Field Director

Runs volunteers, events, canvassing, phone banking, signature gathering, and local chapters. Needs mission assignment, turf and event visibility, volunteer reliability signals, and rapid script updates.

### Volunteer Organizer

Leads local volunteers without being full-time staff. Needs simple workflows for recruiting, hosting events, checking people in, tracking commitments, and reporting local progress.

### Volunteer

May have 30 minutes or 10 hours. Needs clear next actions, training, scripts, event options, and confidence that their work is useful.

### Policy and Communications Lead

Publishes policy, messaging, speeches, emails, and explainers. Needs source-backed drafting, approval workflows, version history, and guardrails against unsupported claims.

### Compliance Officer or Treasurer

Tracks donation rules, reporting obligations, disclaimers, contribution limits, and audit trails. Needs conservative defaults, warnings, review queues, and exportable records.

### Candidate or Executive Director

Needs a trusted operating overview: policy positions, campaign progress, major risks, fundraising state, volunteer activity, and upcoming commitments.

## Product Principles

### Fast To First Campaign

The first and loudest promise is time-to-launch. A new campaign should go from signup to a live, credible public presence — site, policy, volunteer intake, events — in a single sitting. Templates, sensible defaults, and one-pass provisioning matter more than configurability. Every feature is judged first by whether it slows a campaign down.

### Campaign Operations First

CampaignOS should optimize for daily campaign work: deadlines, lists, assignments, owners, status, exports, review queues, and auditability.

### Lean Core Team

CampaignOS assumes a focused core operating team — even inside a national presidential campaign — amplified by AI rather than scaled by headcount. The platform should let a small group run a presidential-scale operation. Features should reduce coordination load before they add sophistication.

### Source-Backed Trust

Every policy claim and public AI answer should trace back to approved sources. If CampaignOS cannot support an answer from approved sources, it should refuse or state the gap.

### Human Approval For Public Output

AI can draft, summarize, classify, and recommend. It cannot publish campaign content, legal summaries, fundraising copy, volunteer scripts, ballot instructions, or policy claims without human approval.

### Multi-Tenant From Day One

Every supporter, event, policy, source, interaction, donation, mission, and content item belongs to a campaign. Users may belong to multiple campaigns, but active campaign context must always be explicit.

### CRM As The Spine

All modules should attach to shared people, organization, interaction, consent, and audit records. The system should always be able to answer who owns this, who changed it, who it affects, what rule applies, and what evidence supports it.

### Mobile Field Work Is Core

The volunteer mobile experience is a first-class product. The PWA should work in the field, with low-bandwidth and offline-tolerant workflows planned from the start.

## MVP Roadmap

### Milestone 0: Public Foundation

Goal: make CampaignOS credible as an open-source campaign platform.

Includes:

- Public landing page
- Campaign profile
- Policy index
- Individual policy pages
- Volunteer signup
- Event listing
- Basic admin login
- Campaign-level tenant model
- Source and citation model for policy content

Not included:

- Full CRM automation
- Donation processing
- Native mobile app
- AI publishing automation
- Advanced ballot-access workflows

Primary value: a campaign can publish transparent policy and collect volunteer interest.

### Milestone 1: PolicyHub And Volunteer Intake

Goal: ship the first useful campaign operating loop: publish policy, answer questions, recruit supporters.

Includes:

- Policy editor
- Policy version history
- Source document upload
- Citation attachment to policy sections
- AI policy assistant limited to approved campaign sources
- Volunteer signup form
- Volunteer profile records
- Volunteer interest tags
- Basic admin CRM list
- Audit log for policy and source changes

Primary value: a small campaign can maintain a credible public policy platform and turn interested readers into volunteer records.

### Milestone 2: Events And Missions

Goal: convert passive supporters into organized action.

Includes:

- Event creation and RSVP
- Volunteer check-in
- Mission assignment
- Basic volunteer dashboard
- Organizer dashboard
- Volunteer notes and interaction history
- Role-based access for admin, organizer, and volunteer
- Human approval workflow for AI-generated scripts or messages

Primary value: field teams can schedule work, recruit volunteers, and track participation.

### Milestone 3: Content Approval System

Goal: let campaigns produce content faster without losing trust or control.

Includes:

- Content drafts for email, social, speech, press release, and policy explainer
- AI-assisted draft generation from approved policy and source material
- Required human approval before publish or export
- Revision history
- Provenance metadata with prompt, model, provider, and source IDs
- Disclaimer checklist
- Message archive

Primary value: campaigns can scale content production while keeping accountability and source discipline.

### Milestone 4: Ballot Access Lite

Goal: support a major operational pain point for independent and emerging campaigns.

Includes:

- State-by-state ballot-access requirement records
- Source URL, effective date, verification status, reviewer, and review timestamp
- Deadline tracker
- Signature goal tracker
- Petition packet links
- Volunteer signature-gathering missions
- Risk status: green, yellow, red
- Legal review workflow status

Primary value: campaign staff can see ballot-access progress and operational risk across jurisdictions.

> **Beyond Lite:** ballot access is the flagship presidential capability. The full vision — per-state
> research subagents, a volunteer-time optimization engine ("best use of your next two hours"),
> event-aware opportunity targeting, digital-everywhere signature capture, and a ballot-access
> modernization movement — is specified in [`BALLOT_ACCESS_OPTIMIZATION_PLAN.md`](./BALLOT_ACCESS_OPTIMIZATION_PLAN.md) (RFC-001).

### Milestone 5: PWA Volunteer App

Goal: make CampaignOS useful in the field.

Includes:

- Mobile-first volunteer home
- Assigned missions
- Nearby events
- Training modules
- Simple canvassing script view
- Phone banking script view
- Signature gathering instructions
- Check-in and completion reporting
- Push-notification-ready architecture
- Offline-tolerant mission screens

Primary value: volunteers can act without requiring staff to manually explain every next step.

## Technical Architecture

CampaignOS should be built as a modular, multi-tenant platform centered on `Campaign`.

```text
Web / PWA / Admin
        |
        v
Next.js App Router
        |
        v
tRPC API Layer
        |
        v
Domain Services
        |
        v
Prisma + Postgres + pgvector
        |
        v
AI Providers / Search / Email / SMS / Payments / Storage
```

The system should separate:

- Presentation: Next.js, React, Tailwind, shadcn/ui
- API boundary: tRPC routers grouped by product domain
- Domain logic: campaign, CRM, policy, content, ballot access, events, fundraising
- Persistence: Prisma models backed by Postgres
- AI layer: provider abstraction, retrieval, citation validation, moderation, provenance
- Integrations: payments, email, SMS, object storage, analytics, compliance exports

## Monorepo Shape

Recommended package manager: `pnpm`.

```text
campaign-os/
  apps/
    web/                 # Next.js public site, admin, volunteer PWA
    mobile/              # Future Expo app
    api/                 # Optional standalone API server if split later

  packages/
    db/                  # Prisma schema, migrations, generated client
    api/                 # tRPC routers, procedures, auth middleware
    auth/                # Auth helpers, session, RBAC
    config/              # Shared env parsing, feature flags
    ui/                  # Shared React components built on shadcn/ui
    domain/              # Shared domain types and business rules
    ai/                  # AI providers, RAG, citation validation
    validators/          # Shared Zod schemas
    integrations/        # Email, SMS, payments, storage, analytics
    compliance/          # Contribution rules, export formats, audit helpers
    utils/               # Shared utilities

  prisma/
    schema.prisma
    migrations/

  docs/
    architecture/
    rfcs/
    governance/
```

For MVP, `apps/web` can host public, volunteer, and admin experiences. Avoid splitting services until operational pressure demands it.

## API Boundaries

Use tRPC for first-party application APIs.

Suggested routers:

- `campaignRouter`
- `userRouter`
- `authRouter`
- `crmRouter`
- `policyRouter`
- `sourceDocumentRouter`
- `citationRouter`
- `contentRouter`
- `eventRouter`
- `volunteerRouter`
- `missionRouter`
- `ballotAccessRouter`
- `fundraisingRouter`
- `auditRouter`
- `aiRouter`

API rules:

- All procedures require campaign context unless explicitly public.
- Mutations write audit logs for sensitive entities.
- Admin procedures enforce RBAC at the procedure boundary.
- AI procedures distinguish draft, reviewed, approved, and published states.
- Public AI assistant endpoints retrieve only from approved source documents.
- Zod validation applies at every external input boundary.

Expose REST or webhook endpoints separately where needed:

- `/api/webhooks/stripe`
- `/api/webhooks/email`
- `/api/webhooks/sms`
- `/api/public/events`
- `/api/public/policies`

## Data Model

### Tenant Core

- `Campaign`
- `User`
- `CampaignMembership`
- `Role`
- `Permission`
- `AuditLog`

Every tenant-owned table should include:

- `campaignId`
- `createdAt`
- `updatedAt`
- `createdById`
- `updatedById`

Use compound indexes such as `(campaignId, id)` and `(campaignId, createdAt)`.

### CRM Core

`Person` is the canonical human record. It represents supporters, volunteers, donors, voters, organizers, petition signers, staff, and media contacts.

`Organization` represents unions, clubs, nonprofits, vendors, endorsers, local groups, media outlets, and partner organizations.

`Relationship` connects people and organizations.

`Interaction` is the shared activity timeline for phone calls, texts, emails, event attendance, donations, petition signatures, canvass conversations, support requests, and AI-assisted notes.

### Operational Entities

- `VolunteerProfile`
- `Chapter`
- `Event`
- `EventRegistration`
- `EventAttendance`
- `Mission`
- `Policy`
- `PolicyVersion`
- `SourceDocument`
- `SourceChunk`
- `Citation`
- `ContentItem`
- `ContentRevision`
- `Approval`
- `BallotRequirement`
- `RequirementReview`
- `Petition`
- `PetitionPacket`
- `Signature`
- `SignatureValidation`
- `Donation`
- `ComplianceCheck`
- `ComplianceIssue`
- `ReportingExport`
- `ConsentRecord`
- `SuppressionListEntry`
- `DataRequest`
- `AIResponse`
- `AIProvenance`

## Tenancy And RBAC

CampaignOS should enforce tenancy at the database, API, and application layers.

Core rules:

- Every mutable operational entity includes `campaignId`.
- Users access campaign data only through explicit membership.
- Users may belong to multiple campaigns, but active campaign context is explicit.
- Cross-campaign data sharing is disabled by default.
- Platform-level records are rare and clearly marked.

Suggested campaign-scoped roles:

- `owner`
- `admin`
- `organizer`
- `content_editor`
- `content_approver`
- `policy_editor`
- `compliance_officer`
- `treasurer`
- `volunteer`
- `viewer`

Prefer capability permissions over hard-coded role checks:

- `crm.person.read`
- `crm.person.update`
- `fundraising.donation.read`
- `fundraising.compliance.export`
- `content.item.approve`
- `policy.source.verify`
- `ballot.requirement.review`
- `audit.read`

## Auditability

Audit logs are first-class records.

Every meaningful mutation should produce an append-only audit event with:

- `campaignId`
- `actorUserId`
- `actorType`
- `action`
- `entityType`
- `entityId`
- `before`
- `after`
- `reason`
- `ipAddress`
- `userAgent`
- `requestId`
- `createdAt`

Important auditable actions:

- Person created, merged, updated, deleted
- Consent changed
- Donation received or adjusted
- Compliance status changed
- Source approved or rejected
- AI answer generated
- Content approved or published
- Role changed
- Export generated
- Petition signature validated
- Legal requirement verified

Exports should always be logged with campaign, user, timestamp, filters, and row count.

## Consent And Privacy

Consent should be modeled separately from contact records.

`ConsentRecord` should include:

- `campaignId`
- `personId`
- `channel`
- `purpose`
- `status`
- `source`
- `capturedAt`
- `expiresAt`
- `withdrawnAt`

Channels:

- Email
- SMS
- Phone
- Mail
- Canvassing
- Volunteer coordination
- Donation follow-up

Privacy rules:

- A person may consent to one purpose but not another.
- SMS and email consent need explicit source tracking.
- Unsubscribe and suppression state override normal outreach.
- Data export and deletion requests are tracked.
- Sensitive fields are minimized and access-controlled.

## AI And RAG Architecture

CampaignOS should treat source ingestion as a controlled publishing workflow, not a generic upload bucket.

Supported source types:

- Policy drafts
- Legal statutes and election rules
- Government pages
- FEC and state compliance documents
- Campaign-approved position papers
- Internal talking points
- Press releases
- Research reports
- Event and volunteer guidance

Each source document should store:

- `campaignId`
- `sourceId`
- `title`
- `sourceType`
- `canonicalUrl`
- `publisher`
- `effectiveDate`
- `retrievedAt`
- `uploadedBy`
- `reviewedBy`
- `verificationStatus`
- `allowedForAI`
- `allowedUseCases`
- `version`
- `checksum`

Source statuses:

- `draft`
- `pending_review`
- `approved`
- `deprecated`
- `rejected`

Only approved sources with `allowedForAI = true` are eligible for RAG.

## Retrieval And Citation Validation

Use hybrid retrieval:

- Keyword search for exact terms, statute references, names, dates, and legal citations
- Vector search for semantic matching
- Metadata filtering for campaign, jurisdiction, issue, source status, and source type

Query flow:

1. Classify intent.
2. Apply strict metadata filters.
3. Retrieve candidate chunks.
4. Re-rank by relevance, recency, authority, and verification status.
5. Pass only approved chunks into the model.
6. Require citations in the answer.
7. Validate that every citation maps to retrieved source text.

No model should answer policy or legal questions from general prior knowledge.

Every cited claim should map to:

- `sourceId`
- `chunkId`
- `quoteRange` or character offsets
- `url`
- `retrievedAt`
- `sourceVersion`

Validation rules:

- Reject citations not present in retrieved context.
- Reject answers with unsupported factual claims.
- Reject citations to deprecated or unapproved sources.
- Prefer primary sources over secondary summaries.
- Flag stale legal or compliance sources for review.
- Require explicit uncertainty when sources conflict.

## AI Content Workflow

AI-generated content should never publish directly.

Workflow:

1. Staff creates content request.
2. System retrieves approved source context.
3. Model drafts content.
4. System attaches citations and provenance metadata.
5. Automated checks run.
6. Human reviewer edits, approves, or rejects.
7. Final approver publishes.
8. Published artifact keeps full revision history.

Automated checks:

- Unsupported claim detection
- Citation validation
- Compliance disclaimer check
- Tone and brand check
- Prompt-injection scan

Content states:

- `requested`
- `drafted_by_ai`
- `needs_review`
- `changes_requested`
- `approved`
- `published`
- `archived`

Require stricter gates for:

- Fundraising emails
- Legal or compliance language
- Ballot-access instructions
- Candidate statements
- Public policy commitments
- Press releases
- Mass emails and SMS

## AI Provider Abstraction

Create a provider-neutral AI package.

```ts
interface AIProvider {
  generateText(request: GenerateTextRequest): Promise<GenerateTextResult>
  generateStructured<T>(request: StructuredRequest): Promise<T>
  embed(request: EmbedRequest): Promise<EmbedResult>
  classify(request: ClassifyRequest): Promise<ClassifyResult>
}
```

Initial providers:

- OpenAI
- OpenRouter-compatible APIs
- Local models

The abstraction should support model routing, cost controls, latency tracking, fallback providers, structured output, streaming, embeddings, safety metadata, and tenant-level provider configuration.

## AI Safety And Evaluation

Prompt-injection defenses:

- Treat retrieved source text as untrusted data.
- Wrap retrieved chunks in structured delimiters.
- Tell the model source text may contain malicious instructions.
- Strip or flag instructions embedded inside documents.
- Keep tool permissions separate from generated text.
- Validate outputs after generation.
- Maintain allowlists for source domains and publishers.

Evaluation categories:

- Citation accuracy
- Unsupported claim rate
- Refusal correctness
- Policy consistency
- Legal and compliance accuracy
- Prompt-injection resistance
- Retrieval relevance
- Source freshness
- Tone and brand compliance
- Reviewer edit distance

Maintain golden datasets for common policy questions, hostile prompts, ambiguous questions, source conflicts, stale-source scenarios, legal edge cases, and campaign-specific issue positions.

## VolunteerOS And Mobile Field Organizing

VolunteerOS should turn supporters into reliable organizers with minimal staff overhead.

Core loop:

1. Recruit volunteer.
2. Onboard and verify readiness.
3. Assign mission.
4. Execute field work.
5. Capture outcomes.
6. Escalate issues.
7. Reward progress.
8. Reassign next mission.

PWA requirements:

- Fast install flow from web signup
- Offline-first mission screens
- Large tap targets
- Low-bandwidth mode
- Minimal navigation during active field work
- Clear next-action home screen
- Push-notification-ready architecture
- Role-aware interface for volunteers, captains, organizers, and admins

Core PWA screens:

- Home
- Missions
- Canvassing
- Phone Banking
- Events
- Ballot Access
- Training
- Profile
- Help and Safety

## Canvassing

Capabilities:

- Assigned turf or route
- Household or person records
- Script with optional AI-localized talking points
- Survey questions
- Contact outcomes
- Notes
- Follow-up requests
- Literature drop tracking
- Safety check-in
- Organizer escalation
- Offline route packet

Design constraint: canvassers should see one action at a time: next door, script, outcome, notes, submit.

## Phone Banking

Capabilities:

- Call queue
- Contact profile
- Script
- Disposition and outcome
- Follow-up actions
- Opt-out handling
- Wrong-number handling
- Do-not-call safeguards
- Text or email follow-up where permitted
- AI objection handling from approved campaign materials

The system should distinguish volunteer-friendly guided calling from organizer/admin list management.

## Events

Workflows:

- RSVP
- Reminder notifications
- Check-in
- Role assignment
- Shift tracking
- Attendance capture
- Post-event follow-up
- No-show tracking
- Volunteer conversion prompts

Event types:

- Rally
- Training
- Canvass launch
- Phone bank
- Petition drive
- Fundraiser
- Chapter meeting
- Community service
- Press or public appearance

## Signature Gathering

Ballot-access workflows need stricter validation than ordinary volunteering.

Capabilities:

- State-specific petition instructions
- Volunteer certification before collecting signatures
- Petition packet assignment
- Signature goal tracking
- Location recommendations
- Batch submission tracking
- Error and rejection tracking
- Chain-of-custody notes
- Legal review status
- Deadline countdowns

Mobile UX should make eligibility rules unavoidable: who can sign, what fields are required, what invalidates a petition, and where completed forms go.

## Training And Certification

Training should gate higher-risk activities.

Modules:

- Campaign basics
- Voter contact rules
- Canvassing safety
- Phone banking etiquette
- Data privacy
- Ballot-access rules by state
- De-escalation
- Event roles
- Fundraising compliance basics

Certification rules:

- Required modules per mission type
- Short quizzes
- Expiration dates for legal or compliance-sensitive certifications
- Organizer override with audit log
- Training status visible to volunteer and organizer

## Offline Mode

Offline-capable data:

- Assigned route
- Scripts
- Contact list subset
- Survey questions
- Petition instructions
- Event check-in roster
- Active missions
- Safety contacts

Sync behavior:

- Local-first writes
- Clear sync status
- Conflict detection
- Organizer-visible stale data warnings
- No silent data loss
- Sensitive records expire from device cache after configurable period

## Safety And Escalation

Volunteer safety is a first-class workflow.

Features:

- Check-in and check-out for canvassing shifts
- Optional buddy assignment
- Emergency contact display
- Incident reporting
- Harassment or threat escalation
- Help request button
- Location sharing during active field shifts where consented
- Organizer alert queue
- Post-incident follow-up log

Escalation categories:

- Safety threat
- Legal or compliance concern
- Voter or contact complaint
- Media inquiry
- Opponent interaction
- Data issue
- Accessibility issue
- Volunteer misconduct

## Compliance Workflows

### Fundraising

Workflow:

1. Donation received.
2. Donor matched or person created.
3. Contribution limits checked.
4. Required employer and occupation fields validated where applicable.
5. Compliance warning generated if needed.
6. Treasurer reviews exception.
7. Export generated for reporting.

Entities:

- `Donation`
- `ComplianceCheck`
- `ComplianceIssue`
- `ReportingExport`
- `TreasurerReview`

### Ballot Access

Workflow:

1. Jurisdiction requirement created.
2. Source URL and effective date attached.
3. Legal reviewer verifies requirement.
4. Signature goals generated.
5. Petition packets issued.
6. Signatures collected.
7. Validation status tracked.
8. Filing package prepared.
9. Submission logged.

Entities:

- `FilingRequirement`
- `LegalSource`
- `RequirementReview`
- `PetitionPacket`
- `Signature`
- `SignatureValidation`
- `FilingSubmission`

### Content And AI

Workflow:

1. Draft created by human or AI.
2. Sources attached.
3. AI provenance recorded.
4. Human reviewer approves.
5. Required disclaimers checked.
6. Publishing logged.
7. Revision history retained.

Entities:

- `ContentItem`
- `ContentRevision`
- `SourceDocument`
- `Citation`
- `Approval`
- `DisclaimerCheck`

## Deployment Strategy

MVP deployment should be simple:

- Next.js app
- Postgres database with pgvector
- Object storage
- Background job runner
- Email/SMS provider
- Payment processor adapter

Open-source self-hosting should eventually support:

```text
docker-compose.yml
Postgres + pgvector
Next.js app
worker
object storage adapter
```

Likely integration surfaces:

- Payments: Stripe, ActBlue-style adapter, compliance exports
- Email: Resend, SendGrid, Mailchimp, custom SMTP
- SMS: Twilio, MessageBird, 10DLC-aware providers
- Storage: S3, R2, MinIO
- Maps and routing: Mapbox, Google Maps, OpenStreetMap
- Voter/contact data: import/export adapters
- Analytics: Plausible, PostHog, Segment
- Auth: OAuth, passkeys, SSO later
- Mobile push: Expo notifications in Phase 2

Design integrations as adapters, not hard-coded dependencies.

## Open Source Governance

CampaignOS should use a transparent, durable governance model:

- Core maintainers with merge authority
- Working groups for policy, compliance, AI safety, security, mobile, fundraising, and field organizing
- Public roadmap
- RFC process
- Code owners
- Contributor ladder
- Conflict-of-interest policy

Governance should explicitly prevent any single campaign, party, donor, or vendor from permanently controlling the project.

## Licensing Strategy

AGPL-3.0 is best if the project wants to prevent proprietary SaaS clones from taking public code, improving it privately, and offering hosted campaign infrastructure without contributing changes back.

Apache-2.0 is best if the project prioritizes broad adoption, integration, vendor participation, and low-friction institutional use.

Practical hybrid to evaluate:

- Core app: AGPL-3.0 or Apache-2.0
- SDKs and client libraries: Apache-2.0
- Policy templates and content schemas: CC-BY-4.0
- Documentation: CC-BY-4.0
- Brand assets: trademark-controlled

Default recommendation: use Apache-2.0 for maximum adoption unless preventing hosted proprietary capture is a core strategic requirement.

## RFC Process

Use RFCs for major product, architecture, governance, compliance, AI, and data model changes.

RFCs should include:

- Problem statement
- Goals and non-goals
- User impact
- Security and privacy implications
- Compliance implications
- AI safety implications
- Alternatives considered
- Migration plan
- Open questions

RFC categories:

- `architecture`
- `governance`
- `security`
- `compliance`
- `ai`
- `crm`
- `mobile`
- `templates`
- `integrations`

## Contributor Onboarding

Recommended project assets:

- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`
- `SECURITY.md`
- Local dev setup guide
- Architecture overview
- Data model overview
- First good issues
- Product glossary
- Compliance glossary
- AI safety guidelines
- Maintainer review expectations

Contributor tracks:

- Engineering
- Policy research
- Ballot-access research
- Compliance review
- UX and design
- Documentation
- Localization
- Template creation
- Security review

The project should support non-code contributions as first-class work.

## Template Ecosystem

Templates should become a major adoption engine.

CampaignOS ships first with a single, deeply-built **Presidential campaign** template. The remaining templates are deferred until the presidential experience is proven, then added as the platform expands down-ballot:

Initial:

- Presidential campaign

Planned (post-presidential):

- Congressional campaign
- State legislative campaign
- Local candidate
- Ballot initiative
- Nonprofit advocacy
- Union campaign
- Issue campaign
- Volunteer chapter
- GOTV operation
- Petition drive

Templates should include:

- Default roles
- CRM schema presets
- Policy page structure
- Event types
- Volunteer missions
- Donation settings
- Compliance checklist
- Content approval workflows
- AI source allowlists
- Landing page starter
- Email/SMS copy packs
- Field scripts

## Hosted And Self-Hosted Strategy

CampaignOS should support both.

Self-hosted is best for technically capable campaigns, privacy-sensitive organizations, long-term institutional users, international civic groups, and organizations with strict data-control requirements.

Hosted is best for small campaigns, local candidates, ballot initiatives, nontechnical civic groups, and fast onboarding.

Recommended approach:

- Open-source core remains self-hostable.
- Official hosted service funds maintenance.
- Hosted service offers backups, upgrades, deliverability, AI provider configuration, security hardening, and compliance workflows.
- Data portability is guaranteed.
- Exports, migrations, and self-host transition are documented.

## Success Metrics

### Public Trust

- Published policies with citations
- AI assistant answers with valid citations
- Unsupported-answer refusals
- Policy page views to volunteer signup conversion

### Volunteer Activation

- Volunteer signups
- Signup-to-first-action conversion
- Event RSVP-to-attendance rate
- Missions completed per active volunteer
- Organizer-created missions per week

### Operational Discipline

- Policies with complete source coverage
- Content drafts approved vs. rejected
- Time from draft creation to approval
- Open ballot-access deadlines by risk level
- Stale legal or source records older than review threshold

### Campaign Adoption

- Active campaigns
- Active organizers per campaign
- Active volunteers per campaign
- Campaign admin retention
- CRM imports and exports

### Safety And Governance

- Audit-log coverage for sensitive actions
- AI outputs blocked from auto-publishing
- Source documents with verification metadata
- Security issues reported and resolved
- Contributor activity
- Accepted RFCs

## Key Risks

### Breadth Risk

CampaignOS could become too broad too early. The MVP should not try to replace NGP VAN, ActBlue, Mobilize, Slack, Google Docs, and a compliance system all at once.

Mitigation: start with policy trust, volunteer activation, shared CRM primitives, audit logs, and exportability.

### AI Trust Risk

A hallucinated policy answer or unsupported legal/compliance suggestion could damage credibility.

Mitigation: approved-source-only RAG, citation validation, refusal behavior, provenance, evaluations, and human approval.

### Compliance Risk

Fundraising and election law vary heavily by jurisdiction.

Mitigation: provide tracking, warnings, source-backed review workflows, exports, and disclaimers. Do not present the product as legal counsel.

### Multi-Tenancy Risk

Tenant leakage would be catastrophic.

Mitigation: enforce `campaignId` everywhere, require campaign context in tRPC procedures, audit sensitive access, and consider Postgres row-level security later as defense in depth.

### Data Privacy Risk

CampaignOS will handle sensitive political affiliation, donor, volunteer, and possibly voter-related data.

Mitigation: RBAC, consent records, suppression lists, export logs, data retention policies, encryption, and least-privilege access.

### Adoption Risk

Campaigns may fear relying on open-source software for regulated workflows.

Mitigation: transparent governance, security policy, hosted option, verified templates, conservative compliance language, and strong documentation.

### Ecosystem Capture Risk

A vendor, donor, campaign, or proprietary fork could dominate the ecosystem.

Mitigation: conflict-of-interest policy, public roadmap, code owners, trademark policy, contributor ladder, and clear licensing choice.

## Immediate Next Steps

1. Decide license direction: Apache-2.0, AGPL-3.0, or hybrid.
2. Scaffold the monorepo with `apps/web`, shared packages, Prisma, and docs.
3. Implement the tenant core: `Campaign`, `User`, `CampaignMembership`, roles, permissions, audit log.
4. Implement the CRM spine: `Person`, `Organization`, `Relationship`, `Interaction`, `ConsentRecord`.
5. Build public campaign pages: landing, policy index, policy detail, events, volunteer signup.
6. Build admin basics: login, campaign switcher, CRM list, policy editor, source upload.
7. Add source and citation models before adding the AI assistant.
8. Implement approved-source-only policy assistant with citation validation and refusal behavior.
9. Add volunteer events and mission assignment.
10. Add content approval workflow with AI provenance.
