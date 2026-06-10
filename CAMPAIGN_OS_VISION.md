# CampaignOS

## Vision, Product Strategy, and Technical Architecture

Version 1.0

## Executive Summary

CampaignOS is an open-source, AI-native operating system for political campaigns. The initial focus is the national presidential campaign; the same platform is designed to expand to congressional, state, local, ballot-initiative, nonprofit, and advocacy use cases over time.

CampaignOS aims to become the Linux of democratic participation.

CampaignOS starts by serving national presidential campaigns end-to-end, but is built as reusable infrastructure that any candidate or movement can eventually deploy — not throwaway software for a single race.

The platform combines:

- Policy publishing
- Volunteer mobilization
- Ballot access operations
- Campaign CRM
- Fundraising workflows
- AI-assisted content creation
- Compliance tooling
- Mobile field organizing

into a single open-source ecosystem.

The initial focus — and the only campaign type the first release targets — is a national presidential campaign.

The long-term goal is to enable thousands of candidates and civic organizations to participate more effectively in democracy.

## Core Mission

Increase democratic participation by reducing the cost and complexity of running a campaign.

The first promise is speed: a campaign should launch in an afternoon, not over six weeks of tool selection, integration, and consultants. Ease of getting started — and getting useful fast — is the product's primary differentiator.

CampaignOS should allow a small team with AI assistance to operate with capabilities previously requiring large staffs and expensive consultants.

## Product Pillars

### 1. PolicyHub

Mission: Create the most transparent policy platform ever built.

Every policy includes:

- Summary
- Detailed proposal
- Source citations
- Version history
- Cost estimates
- Implementation roadmap
- Success metrics
- Criticisms
- Responses

AI assistant requirements:

- Answers questions only from approved sources
- No hallucinations
- All answers include citations

### 2. VolunteerOS

Mission: Turn supporters into highly effective organizers.

Available as:

- Web application
- Progressive Web App
- Native iOS app
- Native Android app

Volunteer capabilities:

- Onboarding
- Events
- Phone banking
- Canvassing
- Signature gathering
- Recruiting
- Fundraising support
- Local chapter participation

AI capabilities:

- Call scripts
- Canvassing scripts
- Objection handling
- Local issue briefings
- Mission recommendations

### 3. BallotAccessOS

Mission: Become the best ballot-access platform ever created.

Capabilities:

- 50-state tracking
- Filing requirements
- Signature requirements
- Petition generation
- Volunteer deployment
- Risk scoring
- Deadline management
- Legal review workflows

All legal requirements include:

- Source URL
- Effective date
- Verification status
- Review history

### 4. ContentOS

Mission: Allow campaigns to create trustworthy, high-quality content at scale.

Content types:

- Social media
- Emails
- Speeches
- Press releases
- Policy explainers
- Video scripts
- Volunteer materials

Requirements:

- Human approval required
- Revision history
- Source tracking
- AI provenance metadata

### 5. Campaign CRM

Mission: Single source of truth for campaign relationships.

Entities:

- Supporters
- Volunteers
- Donors
- Organizers
- Chapters
- Events
- Interactions
- Petitions
- Issues

All modules share CRM records.

### 6. FundraisingOS

Mission: Compliance-aware donation infrastructure.

Capabilities:

- Donation tracking
- Contribution limits
- Compliance warnings
- Reporting exports
- Treasurer workflows
- Disclaimer management

## Mobile Strategy

Volunteer mobile experience is a first-class product.

Not a companion app. Not a responsive website. A dedicated organizing platform.

### Volunteer App

Core screens:

#### Home

Shows:

- Assigned missions
- Events
- Goals
- Volunteer statistics

#### Canvassing

Shows:

- Optimized routes
- Talking points
- Surveys
- Notes

#### Phone Banking

Shows:

- Voter records
- Call scripts
- Outcomes
- Follow-up actions

#### Ballot Access

Shows:

- Signature goals
- Nearby opportunities
- Petition tracking

#### Events

Shows:

- RSVP
- Check-in
- Organizer communications

#### Training

Shows:

- Learning modules
- Quizzes
- Certifications

## Architecture

### Frontend

- Next.js
- React
- TypeScript
- Tailwind
- shadcn/ui

### Mobile

Phase 1:

- PWA

Phase 2:

- React Native
- Expo
- Shared TypeScript packages

### Backend

- Node.js
- TypeScript
- tRPC
- Prisma
- Postgres

### AI Layer

Provider abstraction.

Initial providers:

- OpenAI
- OpenRouter-compatible APIs
- Local models

AI services:

- RAG
- Summarization
- Classification
- Content generation
- Volunteer assistance

### Search

- pgvector
- Hybrid retrieval
- Citation validation

## Multi-Tenant Model

CampaignOS is built multi-tenant from the start, even though the initial release targets only one campaign type. Rollout order:

- Presidential campaigns (initial focus)
- Congressional campaigns
- Local candidates
- Nonprofits
- Advocacy groups

Architecture assumption:

- Every entity belongs to a Campaign
- Users may belong to multiple Campaigns

## Security

Requirements:

- RBAC
- Audit logs
- Encryption
- Consent tracking
- Rate limiting
- Zod validation
- Prompt injection protection
- AI source allowlists

No AI output may be published automatically. Human approval is required.

## Open Source Governance

License candidates:

- AGPL-3.0
- Apache-2.0

Evaluate tradeoffs.

Governance:

- Public roadmap
- RFC process
- Security policy
- Contributor guidelines
- Code owners

## MVP

### Public

- Landing page
- Policy pages
- Volunteer signup
- Events
- AI policy assistant

### Admin

- Authentication
- CRM
- Policy editor
- Source document upload
- Citation management
- Content approval

### Mobile

- Volunteer onboarding
- Event participation
- Basic mission assignments

## Long-Term Vision

CampaignOS becomes the default open-source infrastructure for democratic participation.

Success metrics:

- Thousands of campaigns
- Millions of volunteers
- Open policy repository
- Transparent AI-assisted governance
- Reduced cost of political participation
- Increased civic engagement
