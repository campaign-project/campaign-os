export type ProductPillar = {
  name: string
  kind: string
  mission: string
}

export type RoadmapMilestone = {
  phase: string
  name: string
  goal: string
}

export type CampaignRole =
  | "owner"
  | "admin"
  | "organizer"
  | "content_editor"
  | "content_approver"
  | "policy_editor"
  | "compliance_officer"
  | "treasurer"
  | "volunteer"
  | "viewer"

export type CampaignPermission =
  | "campaign.settings.manage"
  | "crm.person.read"
  | "crm.person.update"
  | "event.manage"
  | "mission.assign"
  | "policy.source.verify"
  | "policy.publish"
  | "content.item.create"
  | "content.item.approve"
  | "fundraising.donation.read"
  | "fundraising.compliance.export"
  | "ballot.requirement.review"
  | "audit.read"
  | "ai.provenance.read"

export type CampaignWorkspace = {
  id: string
  name: string
  type: "Presidential Campaign" | "Ballot Initiative" | "Nonprofit Advocacy"
  jurisdiction: string
  cycle: string
  status: "active" | "setup" | "archived"
  health: "green" | "yellow" | "red"
  nextDeadline: string
  stats: {
    supporters: number
    activeVolunteers: number
    publishedPolicies: number
    openRisks: number
  }
}

export type SourceDocumentStatus = "draft" | "pending_review" | "approved" | "deprecated" | "rejected"

export type PolicySource = {
  id: string
  title: string
  publisher: string
  url: string
  effectiveDate: string
  status: SourceDocumentStatus
  allowedForAI: boolean
}

export type PolicyCitation = {
  sourceId: string
  label: string
  claim: string
}

export type CampaignPolicy = {
  id: string
  campaignId: string
  slug: string
  title: string
  summary: string
  status: "draft" | "published" | "archived"
  lastReviewed: string
  version: number
  issueArea: string
  implementation: string[]
  successMetrics: string[]
  criticisms: Array<{
    criticism: string
    response: string
  }>
  citations: PolicyCitation[]
}

export type CampaignEvent = {
  id: string
  campaignId: string
  title: string
  type: "training" | "canvass_launch" | "phone_bank" | "petition_drive" | "fundraiser" | "chapter_meeting"
  startsAt: string
  location: string
  capacity: number
  rsvps: number
  checkedIn: number
  status: "scheduled" | "active" | "completed"
}

export type VolunteerMission = {
  id: string
  campaignId: string
  title: string
  type: "onboarding" | "canvassing" | "phone_banking" | "signature_gathering" | "event_support" | "training"
  priority: "low" | "medium" | "high"
  status: "available" | "assigned" | "in_progress" | "completed"
  dueAt: string
  goal: string
  requiredTraining: string[]
  offlineReady: boolean
}

export type TrainingModule = {
  id: string
  campaignId: string
  title: string
  category: "campaign_basics" | "field_safety" | "privacy" | "ballot_access" | "fundraising"
  durationMinutes: number
  requiredFor: VolunteerMission["type"][]
  quizRequired: boolean
}

export type PersonKind = "supporter" | "volunteer" | "donor" | "organizer" | "petition_signer"

export type CRMPerson = {
  id: string
  campaignId: string
  firstName: string
  lastName: string
  email: string
  phone: string
  city: string
  state: string
  kinds: PersonKind[]
  engagementScore: number
  lastInteractionAt: string
}

export type CRMOrganization = {
  id: string
  campaignId: string
  name: string
  type: "chapter" | "partner" | "vendor" | "endorser" | "community_group"
  city: string
  state: string
}

export type CRMInteraction = {
  id: string
  campaignId: string
  personId: string
  type: "call" | "email" | "event_attendance" | "donation" | "petition_signature" | "canvass_note"
  channel: "phone" | "email" | "in_person" | "system"
  summary: string
  occurredAt: string
}

export type ConsentRecord = {
  id: string
  campaignId: string
  personId: string
  channel: "email" | "sms" | "phone" | "mail" | "volunteer_coordination"
  purpose: "campaign_updates" | "volunteer_coordination" | "donation_follow_up" | "petition_follow_up"
  status: "granted" | "withdrawn" | "unknown"
  capturedAt: string
  source: string
}

export const productPillars: ProductPillar[] = [
  {
    name: "PolicyHub",
    kind: "Trust",
    mission: "Transparent policy publishing with sources, version history, costs, roadmaps, metrics, criticisms, and responses."
  },
  {
    name: "VolunteerOS",
    kind: "Field",
    mission: "Mobile-first organizing for onboarding, events, canvassing, phone banking, signature gathering, and training."
  },
  {
    name: "BallotAccessOS",
    kind: "Legal Ops",
    mission: "Jurisdiction-aware ballot access tracking with sourced requirements, deadlines, risk scoring, and legal review."
  },
  {
    name: "ContentOS",
    kind: "Comms",
    mission: "AI-assisted content creation with source tracking, provenance metadata, revisions, and human approval gates."
  },
  {
    name: "Campaign CRM",
    kind: "Data Spine",
    mission: "A shared record of supporters, volunteers, donors, organizers, chapters, events, interactions, petitions, and issues."
  },
  {
    name: "FundraisingOS",
    kind: "Compliance",
    mission: "Donation tracking, contribution warnings, reporting exports, treasurer workflows, and disclaimer management."
  }
]

export const roadmapMilestones: RoadmapMilestone[] = [
  {
    phase: "Milestone 0",
    name: "Public Foundation",
    goal: "Publish campaign identity, policies, events, volunteer signup, and a tenant-aware admin baseline."
  },
  {
    phase: "Milestone 1",
    name: "PolicyHub + Intake",
    goal: "Create source-backed policy editing, citations, approved-source AI answers, and volunteer records."
  },
  {
    phase: "Milestone 2",
    name: "Events + Missions",
    goal: "Convert supporters into assigned volunteer work with RSVP, check-in, notes, roles, and organizer views."
  },
  {
    phase: "Milestone 3",
    name: "Content Approval",
    goal: "Generate campaign drafts from approved sources while preserving provenance, revision history, and approvals."
  },
  {
    phase: "Milestone 4",
    name: "Ballot Access Lite",
    goal: "Track requirements, deadlines, signature goals, petition packets, risk status, and legal review."
  },
  {
    phase: "Milestone 5",
    name: "PWA Volunteer App",
    goal: "Deliver mobile-first assigned missions, training, events, scripts, check-ins, and offline-tolerant field workflows."
  }
]

export const successMetrics = [
  {
    label: "Trust",
    value: "100%",
    description: "Public policy answers cite approved sources or refuse unsupported questions."
  },
  {
    label: "Activation",
    value: "1st action",
    description: "Every new volunteer gets a concrete mission, event, or training step."
  },
  {
    label: "Control",
    value: "0 auto-publish",
    description: "AI can draft and classify, but publication always requires human approval."
  },
  {
    label: "Portability",
    value: "exportable",
    description: "CRM, audit, donation, policy, source, and volunteer records can leave the system."
  }
]

export const adminQueues = [
  {
    name: "Source review",
    count: 6,
    summary: "Uploaded policy and legal sources waiting for verification before they can be used by AI."
  },
  {
    name: "Ballot deadlines",
    count: 3,
    summary: "Jurisdictions marked yellow or red because signature goals, review status, or filing windows need attention."
  },
  {
    name: "Content approvals",
    count: 9,
    summary: "Draft emails, speeches, posts, and volunteer scripts generated from approved source material."
  },
  {
    name: "Volunteer escalations",
    count: 4,
    summary: "Safety, legal, media, or data issues reported from active field missions."
  }
]

export const rolePermissions: Record<CampaignRole, CampaignPermission[]> = {
  owner: [
    "campaign.settings.manage",
    "crm.person.read",
    "crm.person.update",
    "event.manage",
    "mission.assign",
    "policy.source.verify",
    "policy.publish",
    "content.item.create",
    "content.item.approve",
    "fundraising.donation.read",
    "fundraising.compliance.export",
    "ballot.requirement.review",
    "audit.read",
    "ai.provenance.read"
  ],
  admin: [
    "crm.person.read",
    "crm.person.update",
    "event.manage",
    "mission.assign",
    "policy.source.verify",
    "policy.publish",
    "content.item.create",
    "content.item.approve",
    "ballot.requirement.review",
    "audit.read",
    "ai.provenance.read"
  ],
  organizer: ["crm.person.read", "event.manage", "mission.assign"],
  content_editor: ["content.item.create", "ai.provenance.read"],
  content_approver: ["content.item.approve", "ai.provenance.read"],
  policy_editor: ["policy.source.verify", "policy.publish", "ai.provenance.read"],
  compliance_officer: [
    "fundraising.donation.read",
    "fundraising.compliance.export",
    "ballot.requirement.review",
    "audit.read"
  ],
  treasurer: ["fundraising.donation.read", "fundraising.compliance.export", "audit.read"],
  volunteer: [],
  viewer: ["crm.person.read", "ai.provenance.read"]
}

export const campaignWorkspaces: CampaignWorkspace[] = [
  {
    id: "presidential-2028",
    name: "Forward Horizon 2028",
    type: "Presidential Campaign",
    jurisdiction: "United States",
    cycle: "2028",
    status: "setup",
    health: "yellow",
    nextDeadline: "Iowa filing source review",
    stats: {
      supporters: 18420,
      activeVolunteers: 612,
      publishedPolicies: 14,
      openRisks: 8
    }
  },
  {
    id: "clean-water-act",
    name: "Clean Water Ballot Committee",
    type: "Ballot Initiative",
    jurisdiction: "Colorado",
    cycle: "2026",
    status: "active",
    health: "red",
    nextDeadline: "Signature packet validation",
    stats: {
      supporters: 6240,
      activeVolunteers: 188,
      publishedPolicies: 5,
      openRisks: 11
    }
  },
  {
    id: "housing-now",
    name: "Housing Now Coalition",
    type: "Nonprofit Advocacy",
    jurisdiction: "Multi-state",
    cycle: "Always-on",
    status: "active",
    health: "green",
    nextDeadline: "Quarterly policy refresh",
    stats: {
      supporters: 39112,
      activeVolunteers: 944,
      publishedPolicies: 22,
      openRisks: 3
    }
  }
]

export const policySources: PolicySource[] = [
  {
    id: "source-fec-small-dollar",
    title: "Federal Election Commission contribution limits overview",
    publisher: "Federal Election Commission",
    url: "https://www.fec.gov/help-candidates-and-committees/candidate-taking-receipts/contribution-limits/",
    effectiveDate: "2025-01-01",
    status: "approved",
    allowedForAI: true
  },
  {
    id: "source-census-civic",
    title: "Voting and registration patterns in federal elections",
    publisher: "U.S. Census Bureau",
    url: "https://www.census.gov/topics/public-sector/voting.html",
    effectiveDate: "2024-11-01",
    status: "approved",
    allowedForAI: true
  },
  {
    id: "source-energy-grid",
    title: "Grid resilience and distributed energy planning brief",
    publisher: "Campaign research team",
    url: "https://example.org/research/grid-resilience",
    effectiveDate: "2026-02-12",
    status: "pending_review",
    allowedForAI: false
  },
  {
    id: "source-housing-permits",
    title: "Housing supply and permitting reform memo",
    publisher: "Campaign policy desk",
    url: "https://example.org/policy/housing-permits",
    effectiveDate: "2026-03-03",
    status: "approved",
    allowedForAI: true
  }
]

export const campaignPolicies: CampaignPolicy[] = [
  {
    id: "policy-open-government",
    campaignId: "presidential-2028",
    slug: "open-government",
    title: "Open Government By Default",
    summary:
      "Publish campaign commitments, implementation plans, source material, and progress metrics so voters can inspect the evidence behind every major promise.",
    status: "published",
    lastReviewed: "2026-05-18",
    version: 3,
    issueArea: "Democratic Reform",
    implementation: [
      "Launch a public policy repository with versioned commitments and source trails.",
      "Require every major proposal to include implementation milestones and measurable outcomes.",
      "Publish plain-language updates when policy positions change."
    ],
    successMetrics: [
      "All published policies include approved citations.",
      "Policy updates show visible version history.",
      "Public AI assistant refuses unsupported questions instead of improvising."
    ],
    criticisms: [
      {
        criticism: "Publishing draft policy context could expose internal campaign strategy.",
        response:
          "Only approved source material is public. Internal notes can support staff review without becoming public evidence."
      }
    ],
    citations: [
      {
        sourceId: "source-census-civic",
        label: "Civic participation baseline",
        claim: "Campaign transparency should be evaluated against participation and trust outcomes."
      }
    ]
  },
  {
    id: "policy-small-dollar",
    campaignId: "presidential-2028",
    slug: "small-dollar-democracy",
    title: "Small-Dollar Democracy",
    summary:
      "Build fundraising workflows that help campaigns comply with contribution rules while making grassroots participation easier to understand.",
    status: "published",
    lastReviewed: "2026-05-21",
    version: 2,
    issueArea: "Campaign Finance",
    implementation: [
      "Track donation source, donor identity, contribution type, and reporting status.",
      "Warn treasurers before export when required fields or contribution-limit checks are incomplete.",
      "Keep every compliance export auditable by user, timestamp, filters, and row count."
    ],
    successMetrics: [
      "Donation records include compliance status.",
      "Treasurer review queues resolve flagged donations before reporting export.",
      "Every fundraising content item has disclaimer review before publication."
    ],
    criticisms: [
      {
        criticism: "Compliance software can create false confidence.",
        response:
          "CampaignOS should provide warnings, source-backed workflows, and exports, while clearly avoiding legal-advice claims."
      }
    ],
    citations: [
      {
        sourceId: "source-fec-small-dollar",
        label: "Contribution rules",
        claim: "Fundraising workflows should account for contribution limits and reporting constraints."
      }
    ]
  },
  {
    id: "policy-housing",
    campaignId: "housing-now",
    slug: "faster-housing-permits",
    title: "Faster Housing Permits",
    summary:
      "Reduce procedural delay in housing approvals while preserving safety, accessibility, environmental review, and local accountability.",
    status: "published",
    lastReviewed: "2026-04-30",
    version: 4,
    issueArea: "Housing",
    implementation: [
      "Create model local ordinances for permit clock transparency.",
      "Track bottlenecks from application submission through final approval.",
      "Publish jurisdiction templates for community groups and local candidates."
    ],
    successMetrics: [
      "Median permit review time decreases in participating jurisdictions.",
      "Applicants can inspect where a permit is blocked.",
      "Public dashboards distinguish pending, approved, rejected, and appealed permits."
    ],
    criticisms: [
      {
        criticism: "Faster permitting may weaken public input.",
        response:
          "The policy separates process transparency from substantive review and keeps public comment windows visible."
      }
    ],
    citations: [
      {
        sourceId: "source-housing-permits",
        label: "Permitting memo",
        claim: "Permit clock transparency can reduce administrative uncertainty."
      }
    ]
  }
]

export const campaignEvents: CampaignEvent[] = [
  {
    id: "event-denver-training",
    campaignId: "presidential-2028",
    title: "Denver Organizer Training",
    type: "training",
    startsAt: "2026-06-11T18:00:00-06:00",
    location: "Denver field office",
    capacity: 80,
    rsvps: 62,
    checkedIn: 0,
    status: "scheduled"
  },
  {
    id: "event-iowa-phone-bank",
    campaignId: "presidential-2028",
    title: "Iowa Ballot Access Phone Bank",
    type: "phone_bank",
    startsAt: "2026-06-08T17:30:00-06:00",
    location: "Remote",
    capacity: 140,
    rsvps: 91,
    checkedIn: 0,
    status: "scheduled"
  },
  {
    id: "event-clean-water-petition",
    campaignId: "clean-water-act",
    title: "Boulder Petition Drive",
    type: "petition_drive",
    startsAt: "2026-06-09T09:00:00-06:00",
    location: "Boulder farmers market",
    capacity: 45,
    rsvps: 39,
    checkedIn: 0,
    status: "scheduled"
  },
  {
    id: "event-housing-canvass",
    campaignId: "housing-now",
    title: "Housing Permit Story Canvass",
    type: "canvass_launch",
    startsAt: "2026-06-15T10:00:00-06:00",
    location: "Aurora community center",
    capacity: 60,
    rsvps: 27,
    checkedIn: 0,
    status: "scheduled"
  }
]

export const volunteerMissions: VolunteerMission[] = [
  {
    id: "mission-first-shift",
    campaignId: "presidential-2028",
    title: "Complete first-shift onboarding",
    type: "onboarding",
    priority: "high",
    status: "available",
    dueAt: "2026-06-07",
    goal: "Confirm availability, interests, consent, and first mission preference.",
    requiredTraining: [],
    offlineReady: false
  },
  {
    id: "mission-iowa-calls",
    campaignId: "presidential-2028",
    title: "Make 25 ballot-access calls",
    type: "phone_banking",
    priority: "high",
    status: "assigned",
    dueAt: "2026-06-09",
    goal: "Reach supporters in Iowa and recruit petition volunteers.",
    requiredTraining: ["training-phone-bank", "training-privacy"],
    offlineReady: false
  },
  {
    id: "mission-boulder-signatures",
    campaignId: "clean-water-act",
    title: "Collect 40 verified petition signatures",
    type: "signature_gathering",
    priority: "high",
    status: "in_progress",
    dueAt: "2026-06-10",
    goal: "Collect complete signatures with packet chain-of-custody notes.",
    requiredTraining: ["training-ballot-access", "training-field-safety"],
    offlineReady: true
  },
  {
    id: "mission-housing-canvass",
    campaignId: "housing-now",
    title: "Canvass permit-delay stories",
    type: "canvassing",
    priority: "medium",
    status: "available",
    dueAt: "2026-06-16",
    goal: "Gather resident stories and consented follow-up contacts.",
    requiredTraining: ["training-field-safety", "training-privacy"],
    offlineReady: true
  }
]

export const trainingModules: TrainingModule[] = [
  {
    id: "training-campaign-basics",
    campaignId: "presidential-2028",
    title: "Campaign Basics",
    category: "campaign_basics",
    durationMinutes: 18,
    requiredFor: ["onboarding", "event_support"],
    quizRequired: true
  },
  {
    id: "training-phone-bank",
    campaignId: "presidential-2028",
    title: "Phone Banking Etiquette",
    category: "campaign_basics",
    durationMinutes: 22,
    requiredFor: ["phone_banking"],
    quizRequired: true
  },
  {
    id: "training-privacy",
    campaignId: "presidential-2028",
    title: "Volunteer Data Privacy",
    category: "privacy",
    durationMinutes: 16,
    requiredFor: ["phone_banking", "canvassing", "signature_gathering"],
    quizRequired: true
  },
  {
    id: "training-field-safety",
    campaignId: "clean-water-act",
    title: "Field Safety And Escalation",
    category: "field_safety",
    durationMinutes: 20,
    requiredFor: ["canvassing", "signature_gathering"],
    quizRequired: true
  },
  {
    id: "training-ballot-access",
    campaignId: "clean-water-act",
    title: "Colorado Petition Rules",
    category: "ballot_access",
    durationMinutes: 31,
    requiredFor: ["signature_gathering"],
    quizRequired: true
  }
]

export const crmPeople: CRMPerson[] = [
  {
    id: "person-maya",
    campaignId: "presidential-2028",
    firstName: "Maya",
    lastName: "Rios",
    email: "maya.rios@example.org",
    phone: "+1-303-555-0141",
    city: "Denver",
    state: "CO",
    kinds: ["supporter", "volunteer", "organizer"],
    engagementScore: 92,
    lastInteractionAt: "2026-06-03T18:40:00-06:00"
  },
  {
    id: "person-eli",
    campaignId: "presidential-2028",
    firstName: "Eli",
    lastName: "Turner",
    email: "eli.turner@example.org",
    phone: "+1-515-555-0188",
    city: "Des Moines",
    state: "IA",
    kinds: ["supporter", "volunteer"],
    engagementScore: 74,
    lastInteractionAt: "2026-06-02T12:10:00-06:00"
  },
  {
    id: "person-sam",
    campaignId: "clean-water-act",
    firstName: "Sam",
    lastName: "Nguyen",
    email: "sam.nguyen@example.org",
    phone: "+1-720-555-0109",
    city: "Boulder",
    state: "CO",
    kinds: ["volunteer", "petition_signer"],
    engagementScore: 81,
    lastInteractionAt: "2026-06-04T09:25:00-06:00"
  },
  {
    id: "person-ana",
    campaignId: "housing-now",
    firstName: "Ana",
    lastName: "Patel",
    email: "ana.patel@example.org",
    phone: "+1-720-555-0181",
    city: "Aurora",
    state: "CO",
    kinds: ["supporter", "donor"],
    engagementScore: 67,
    lastInteractionAt: "2026-06-01T15:00:00-06:00"
  }
]

export const crmOrganizations: CRMOrganization[] = [
  {
    id: "org-denver-chapter",
    campaignId: "presidential-2028",
    name: "Denver Volunteer Chapter",
    type: "chapter",
    city: "Denver",
    state: "CO"
  },
  {
    id: "org-clean-water-students",
    campaignId: "clean-water-act",
    name: "Students For Clean Water",
    type: "partner",
    city: "Boulder",
    state: "CO"
  },
  {
    id: "org-housing-tenants",
    campaignId: "housing-now",
    name: "Aurora Tenants Union",
    type: "community_group",
    city: "Aurora",
    state: "CO"
  }
]

export const crmInteractions: CRMInteraction[] = [
  {
    id: "interaction-maya-training",
    campaignId: "presidential-2028",
    personId: "person-maya",
    type: "event_attendance",
    channel: "in_person",
    summary: "Checked in for organizer training and volunteered to lead a canvass launch.",
    occurredAt: "2026-06-03T18:40:00-06:00"
  },
  {
    id: "interaction-eli-call",
    campaignId: "presidential-2028",
    personId: "person-eli",
    type: "call",
    channel: "phone",
    summary: "Completed first phone-bank shift and requested Iowa petition talking points.",
    occurredAt: "2026-06-02T12:10:00-06:00"
  },
  {
    id: "interaction-sam-signature",
    campaignId: "clean-water-act",
    personId: "person-sam",
    type: "petition_signature",
    channel: "in_person",
    summary: "Submitted petition packet with chain-of-custody note for legal review.",
    occurredAt: "2026-06-04T09:25:00-06:00"
  },
  {
    id: "interaction-ana-donation",
    campaignId: "housing-now",
    personId: "person-ana",
    type: "donation",
    channel: "system",
    summary: "Small-dollar donation imported and flagged for receipt follow-up.",
    occurredAt: "2026-06-01T15:00:00-06:00"
  }
]

export const consentRecords: ConsentRecord[] = [
  {
    id: "consent-maya-email",
    campaignId: "presidential-2028",
    personId: "person-maya",
    channel: "email",
    purpose: "volunteer_coordination",
    status: "granted",
    capturedAt: "2026-05-25T10:00:00-06:00",
    source: "Volunteer signup"
  },
  {
    id: "consent-eli-phone",
    campaignId: "presidential-2028",
    personId: "person-eli",
    channel: "phone",
    purpose: "volunteer_coordination",
    status: "granted",
    capturedAt: "2026-05-29T14:20:00-06:00",
    source: "Phone bank signup"
  },
  {
    id: "consent-sam-sms",
    campaignId: "clean-water-act",
    personId: "person-sam",
    channel: "sms",
    purpose: "petition_follow_up",
    status: "granted",
    capturedAt: "2026-06-01T09:00:00-06:00",
    source: "Petition drive RSVP"
  },
  {
    id: "consent-ana-email",
    campaignId: "housing-now",
    personId: "person-ana",
    channel: "email",
    purpose: "donation_follow_up",
    status: "granted",
    capturedAt: "2026-06-01T15:00:00-06:00",
    source: "Donation form"
  }
]

export function getPolicySource(sourceId: string) {
  return policySources.find((source) => source.id === sourceId)
}

export function getPoliciesForCampaign(campaignId: string) {
  return campaignPolicies.filter((policy) => policy.campaignId === campaignId)
}

export function getPublishedPolicies() {
  return campaignPolicies.filter((policy) => policy.status === "published")
}

export function getEventsForCampaign(campaignId: string) {
  return campaignEvents.filter((event) => event.campaignId === campaignId)
}

export function getMissionsForCampaign(campaignId: string) {
  return volunteerMissions.filter((mission) => mission.campaignId === campaignId)
}

export function getTrainingForCampaign(campaignId: string) {
  return trainingModules.filter((module) => module.campaignId === campaignId)
}

export function getPeopleForCampaign(campaignId: string) {
  return crmPeople.filter((person) => person.campaignId === campaignId)
}

export function getPersonById(personId: string) {
  return crmPeople.find((person) => person.id === personId)
}

export function getInteractionsForPerson(personId: string) {
  return crmInteractions.filter((interaction) => interaction.personId === personId)
}

export function getConsentForPerson(personId: string) {
  return consentRecords.filter((record) => record.personId === personId)
}

export function getOrganizationsForCampaign(campaignId: string) {
  return crmOrganizations.filter((organization) => organization.campaignId === campaignId)
}

export function hasPermission(role: CampaignRole, permission: CampaignPermission) {
  return rolePermissions[role].includes(permission)
}
