import Link from "next/link"
import { notFound } from "next/navigation"
import { ClipboardCheck, FileSearch, LockKeyhole, RadioTower } from "lucide-react"
import {
  campaignWorkspaces,
  getPoliciesForCampaign,
  getEventsForCampaign,
  getMissionsForCampaign,
  getPeopleForCampaign,
  hasPermission,
  type CampaignRole
} from "@campaign-os/domain"

const activeRole: CampaignRole = "admin"

const permissionChecks = [
  {
    permission: "crm.person.update" as const,
    label: "Edit CRM records",
    detail: "Create, merge, and update people, organizations, interactions, and consent records."
  },
  {
    permission: "policy.source.verify" as const,
    label: "Verify policy sources",
    detail: "Approve source documents before they can power public policy pages or AI answers."
  },
  {
    permission: "content.item.approve" as const,
    label: "Approve content",
    detail: "Move AI-assisted or human drafts from review into approved and publishable states."
  },
  {
    permission: "audit.read" as const,
    label: "Read audit logs",
    detail: "Inspect sensitive changes, exports, role updates, AI outputs, and compliance events."
  }
]

export default async function CampaignWorkspacePage({
  params
}: {
  params: Promise<{ campaignId: string }>
}) {
  const { campaignId } = await params
  const campaign = campaignWorkspaces.find((workspace) => workspace.id === campaignId)
  const policies = getPoliciesForCampaign(campaignId)
  const events = getEventsForCampaign(campaignId)
  const missions = getMissionsForCampaign(campaignId)
  const people = getPeopleForCampaign(campaignId)

  if (!campaign) {
    notFound()
  }

  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-ink/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link className="text-sm font-black uppercase tracking-[0.2em] text-civic" href="/campaigns">
            Campaign workspaces
          </Link>
          <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
            {campaign.name}
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-ink/68">
            Workspace context is explicit. All modules should receive this campaign ID before reading
            or mutating CRM, policy, volunteer, compliance, source, or AI records.
          </p>
        </div>
        <div className="rounded-full bg-ink px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-paper">
          Active role: {activeRole}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 py-8 lg:grid-cols-[0.9fr_1.1fr]">
        <article className="bg-ink p-6 text-paper shadow-dossier">
          <div className="flex items-center justify-between border-b border-paper/20 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-field">
                Workspace summary
              </p>
              <h2 className="mt-2 font-display text-4xl font-black">Operational spine</h2>
            </div>
            <RadioTower className="size-8 text-signal" />
          </div>

          <div className="mt-6 grid gap-4">
            {[
              ["Campaign ID", campaign.id],
              ["Jurisdiction", campaign.jurisdiction],
              ["Cycle", campaign.cycle],
              ["Status", campaign.status],
              ["Next deadline", campaign.nextDeadline]
            ].map(([label, value]) => (
              <div className="grid grid-cols-[9rem_1fr] border border-paper/15 bg-paper/[0.055] p-4" key={label}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-paper/46">{label}</p>
                <p className="font-black">{value}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="dossier-border bg-paper/82 p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">RBAC preview</p>
          <h2 className="mt-2 font-display text-4xl font-black">Capability checks before screens</h2>
          <div className="mt-8 grid gap-4">
            {permissionChecks.map((check) => {
              const allowed = hasPermission(activeRole, check.permission)
              return (
                <div className="grid gap-4 border border-ink/12 bg-paper/70 p-4 md:grid-cols-[2.25rem_1fr_auto]" key={check.permission}>
                  {allowed ? (
                    <ClipboardCheck className="size-6 text-civic" />
                  ) : (
                    <LockKeyhole className="size-6 text-signal" />
                  )}
                  <div>
                    <h3 className="text-xl font-black">{check.label}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-ink/62">{check.detail}</p>
                  </div>
                  <span className={`h-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${allowed ? "bg-field text-ink" : "bg-signal text-paper"}`}>
                    {allowed ? "allowed" : "blocked"}
                  </span>
                </div>
              )
            })}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-7xl border-t border-ink/15 py-8">
        {people.length > 0 ? (
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">CRM records</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {people.map((person) => (
                <Link
                  className="dossier-border bg-paper/82 p-5 transition hover:bg-field"
                  href={`/admin/crm/${person.id}`}
                  key={person.id}
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/46">
                    {person.kinds.map((kind) => kind.replaceAll("_", " ")).join(" · ")}
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-black">
                    {person.firstName} {person.lastName}
                  </h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-ink/64">
                    Engagement {person.engagementScore} · {person.city}, {person.state}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        {missions.length > 0 ? (
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">Volunteer missions</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {missions.map((mission) => (
                <article className="dossier-border bg-paper/82 p-5" key={mission.id}>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/46">
                    {mission.type.replaceAll("_", " ")} · {mission.priority}
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-black">{mission.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-ink/64">{mission.goal}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {events.length > 0 ? (
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">Upcoming events</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {events.map((event) => (
                <article className="dossier-border bg-paper/82 p-5" key={event.id}>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/46">
                    {event.type.replaceAll("_", " ")} · {event.status}
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-black">{event.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-ink/64">{event.location}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {policies.length > 0 ? (
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">Published policy</p>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {policies.map((policy) => (
                <Link
                  className="dossier-border group bg-paper/82 p-5 transition hover:bg-field"
                  href={`/policies/${policy.slug}`}
                  key={policy.id}
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-ink/46">
                    {policy.issueArea} · v{policy.version}
                  </p>
                  <h3 className="mt-3 font-display text-3xl font-black">{policy.title}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-ink/64">{policy.summary}</p>
                </Link>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["PolicyHub", "Approved sources and citations power public answers.", FileSearch],
            ["VolunteerOS", "Missions and training resolve through campaign membership.", ClipboardCheck],
            ["Audit", "Every sensitive mutation produces a campaign-scoped event.", LockKeyhole]
          ].map(([title, detail, Icon]) => (
            <article className="dossier-border bg-paper/82 p-5" key={title as string}>
              <Icon className="size-7 text-signal" />
              <h3 className="mt-6 font-display text-3xl font-black">{title as string}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink/64">{detail as string}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
