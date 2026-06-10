import Link from "next/link"
import { ArrowRight, CircleAlert, Database, ShieldCheck, UsersRound } from "lucide-react"
import { campaignWorkspaces } from "@campaign-os/domain"

const healthClass = {
  green: "bg-field text-ink",
  yellow: "bg-[#ffd166] text-ink",
  red: "bg-signal text-paper"
}

export default function CampaignsPage() {
  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-ink/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-civic">Tenant Core</p>
          <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
            Campaign workspaces
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-ink/68">
            Every operational record belongs to a campaign. Users can move between workspaces, but
            data access always resolves through explicit membership and permissions.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-paper transition hover:bg-signal"
          href="/admin"
        >
          Admin desk
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 py-8 lg:grid-cols-3">
        {campaignWorkspaces.map((campaign) => (
          <article className="dossier-border bg-paper/82 p-5 shadow-dossier" key={campaign.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">
                  {campaign.type}
                </p>
                <h2 className="mt-3 font-display text-4xl font-black leading-none">
                  {campaign.name}
                </h2>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${healthClass[campaign.health]}`}
              >
                {campaign.health}
              </span>
            </div>

            <dl className="mt-8 grid grid-cols-2 gap-3">
              <div className="border border-ink/12 bg-paper/70 p-3">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-ink/46">
                  Jurisdiction
                </dt>
                <dd className="mt-2 text-lg font-black">{campaign.jurisdiction}</dd>
              </div>
              <div className="border border-ink/12 bg-paper/70 p-3">
                <dt className="text-xs font-black uppercase tracking-[0.16em] text-ink/46">
                  Cycle
                </dt>
                <dd className="mt-2 text-lg font-black">{campaign.cycle}</dd>
              </div>
            </dl>

            <div className="mt-4 border-l-4 border-signal bg-ink p-4 text-paper">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-field">
                Next deadline
              </p>
              <p className="mt-2 text-lg font-black">{campaign.nextDeadline}</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Metric icon={UsersRound} label="Supporters" value={campaign.stats.supporters} />
              <Metric icon={ShieldCheck} label="Volunteers" value={campaign.stats.activeVolunteers} />
              <Metric icon={Database} label="Policies" value={campaign.stats.publishedPolicies} />
              <Metric icon={CircleAlert} label="Open risks" value={campaign.stats.openRisks} />
            </div>

            <Link
              className="group mt-5 flex items-center justify-between bg-civic px-4 py-3 text-paper transition hover:bg-signal"
              href={`/campaigns/${campaign.id}`}
            >
              <span className="text-sm font-black uppercase tracking-[0.18em]">Open workspace</span>
              <ArrowRight className="size-5 transition group-hover:translate-x-1" />
            </Link>
          </article>
        ))}
      </section>
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="border border-ink/12 bg-paper/70 p-3">
      <div className="mb-4 flex items-center justify-between">
        <Icon className="size-5 text-civic" />
        <span className="font-display text-2xl font-black">{value.toLocaleString()}</span>
      </div>
      <p className="text-xs font-black uppercase tracking-[0.16em] text-ink/50">{label}</p>
    </div>
  )
}
