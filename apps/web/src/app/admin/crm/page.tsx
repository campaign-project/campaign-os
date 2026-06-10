import Link from "next/link"
import { ArrowRight, Building2, ContactRound, MailCheck, Phone, UsersRound } from "lucide-react"
import { campaignWorkspaces, crmOrganizations, crmPeople } from "@campaign-os/domain"

export default function CRMPage() {
  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-ink/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link className="text-sm font-black uppercase tracking-[0.2em] text-civic" href="/admin">
            Admin
          </Link>
          <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
            CRM spine
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-ink/68">
            People, consent, organizations, interactions, events, donations, petitions, and volunteer
            work share one campaign-scoped relationship record.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <SummaryCard icon={UsersRound} label="People" value={crmPeople.length} />
          <SummaryCard icon={Building2} label="Organizations" value={crmOrganizations.length} />
          <SummaryCard icon={MailCheck} label="Consent" value="tracked" />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 py-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          {crmPeople.map((person) => {
            const campaign = campaignWorkspaces.find((workspace) => workspace.id === person.campaignId)
            return (
              <article className="dossier-border bg-paper/82 p-5 shadow-dossier" key={person.id}>
                <div className="grid gap-5 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">
                      {campaign?.name ?? person.campaignId}
                    </p>
                    <h2 className="mt-3 font-display text-4xl font-black leading-none">
                      {person.firstName} {person.lastName}
                    </h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {person.kinds.map((kind) => (
                        <span
                          className="rounded-full border border-ink/15 bg-paper px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-ink/60"
                          key={kind}
                        >
                          {kind.replaceAll("_", " ")}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="min-w-32 bg-ink p-4 text-paper">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-field">Engagement</p>
                    <p className="mt-2 font-display text-5xl font-black">{person.engagementScore}</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <ContactMeta icon={MailCheck} label="Email" value={person.email} />
                  <ContactMeta icon={Phone} label="Phone" value={person.phone} />
                  <ContactMeta icon={ContactRound} label="Location" value={`${person.city}, ${person.state}`} />
                </div>

                <Link
                  className="group mt-5 flex items-center justify-between bg-civic px-4 py-3 text-paper transition hover:bg-signal"
                  href={`/admin/crm/${person.id}`}
                >
                  <span className="text-sm font-black uppercase tracking-[0.18em]">Open record</span>
                  <ArrowRight className="size-5 transition group-hover:translate-x-1" />
                </Link>
              </article>
            )
          })}
        </div>

        <aside className="bg-ink p-5 text-paper shadow-dossier">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-field">Organizations</p>
          <h2 className="mt-3 font-display text-4xl font-black leading-none">Local structure</h2>
          <div className="mt-6 grid gap-4">
            {crmOrganizations.map((organization) => {
              const campaign = campaignWorkspaces.find((workspace) => workspace.id === organization.campaignId)
              return (
                <article className="border border-paper/15 bg-paper/[0.055] p-4" key={organization.id}>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-field">
                    {organization.type.replaceAll("_", " ")}
                  </p>
                  <h3 className="mt-2 text-2xl font-black">{organization.name}</h3>
                  <p className="mt-2 text-sm font-semibold leading-6 text-paper/62">
                    {campaign?.name ?? organization.campaignId} · {organization.city}, {organization.state}
                  </p>
                </article>
              )
            })}
          </div>
        </aside>
      </section>
    </main>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
}) {
  return (
    <div className="dossier-border bg-paper/82 p-4">
      <Icon className="mb-5 size-5 text-signal" />
      <p className="font-display text-3xl font-black">{value}</p>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-ink/50">{label}</p>
    </div>
  )
}

function ContactMeta({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="border border-ink/12 bg-paper/70 p-3">
      <div className="mb-3 flex items-center justify-between">
        <Icon className="size-5 text-signal" />
        <p className="text-xs font-black uppercase tracking-[0.16em] text-ink/46">{label}</p>
      </div>
      <p className="break-words font-black">{value}</p>
    </div>
  )
}
