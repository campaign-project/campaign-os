import Link from "next/link"
import { notFound } from "next/navigation"
import { BadgeCheck, CircleAlert, FileText, GitBranch, Target } from "lucide-react"
import { campaignPolicies, campaignWorkspaces, getPolicySource } from "@campaign-os/domain"

export default async function PolicyDetailPage({
  params
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const policy = campaignPolicies.find((candidate) => candidate.slug === slug)

  if (!policy) {
    notFound()
  }

  const campaign = campaignWorkspaces.find((workspace) => workspace.id === policy.campaignId)

  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-ink/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link className="text-sm font-black uppercase tracking-[0.2em] text-civic" href="/policies">
            PolicyHub
          </Link>
          <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
            {policy.title}
          </h1>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-7 text-ink/68">
            {policy.summary}
          </p>
        </div>
        <div className="rounded-full bg-ink px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-paper">
          {campaign?.name ?? policy.campaignId}
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 py-8 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="bg-ink p-6 text-paper shadow-dossier">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-field">Version dossier</p>
          <h2 className="mt-2 font-display text-4xl font-black">v{policy.version}</h2>
          <dl className="mt-6 grid gap-3">
            {[
              ["Issue area", policy.issueArea],
              ["Status", policy.status],
              ["Last reviewed", policy.lastReviewed],
              ["Citation count", String(policy.citations.length)]
            ].map(([label, value]) => (
              <div className="grid grid-cols-[8rem_1fr] border border-paper/15 bg-paper/[0.055] p-4" key={label}>
                <dt className="text-xs font-black uppercase tracking-[0.18em] text-paper/46">{label}</dt>
                <dd className="font-black">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <article className="dossier-border bg-paper/82 p-6">
          <Section icon={GitBranch} title="Implementation Roadmap" items={policy.implementation} />
          <Section icon={Target} title="Success Metrics" items={policy.successMetrics} />

          <div className="mt-8">
            <div className="flex items-center gap-3">
              <CircleAlert className="size-6 text-signal" />
              <h2 className="font-display text-3xl font-black">Criticisms And Responses</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {policy.criticisms.map((item) => (
                <div className="border border-ink/12 bg-paper/70 p-4" key={item.criticism}>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-signal">
                    Criticism
                  </p>
                  <p className="mt-2 font-bold leading-7">{item.criticism}</p>
                  <p className="mt-4 text-sm font-black uppercase tracking-[0.16em] text-civic">
                    Response
                  </p>
                  <p className="mt-2 font-semibold leading-7 text-ink/68">{item.response}</p>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-7xl border-t border-ink/15 py-8">
        <div className="mb-5 flex items-center gap-3">
          <FileText className="size-6 text-civic" />
          <h2 className="font-display text-4xl font-black">Citations</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {policy.citations.map((citation) => {
            const source = getPolicySource(citation.sourceId)
            return (
              <article className="dossier-border bg-paper/82 p-5" key={`${citation.sourceId}-${citation.label}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">
                      {citation.label}
                    </p>
                    <h3 className="mt-3 text-xl font-black">{source?.title ?? citation.sourceId}</h3>
                  </div>
                  {source?.status === "approved" && source.allowedForAI ? (
                    <BadgeCheck className="size-6 shrink-0 text-civic" />
                  ) : (
                    <CircleAlert className="size-6 shrink-0 text-signal" />
                  )}
                </div>
                <p className="mt-4 text-sm font-semibold leading-6 text-ink/68">{citation.claim}</p>
                {source ? (
                  <dl className="mt-5 grid gap-2 text-sm font-bold text-ink/62">
                    <div className="flex justify-between gap-4 border-t border-ink/10 pt-2">
                      <dt>Publisher</dt>
                      <dd>{source.publisher}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-ink/10 pt-2">
                      <dt>Effective date</dt>
                      <dd>{source.effectiveDate}</dd>
                    </div>
                    <div className="flex justify-between gap-4 border-t border-ink/10 pt-2">
                      <dt>AI allowed</dt>
                      <dd>{source.allowedForAI ? "yes" : "no"}</dd>
                    </div>
                  </dl>
                ) : null}
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}

function Section({
  icon: Icon,
  title,
  items
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  items: string[]
}) {
  return (
    <section className="mt-8 first:mt-0">
      <div className="flex items-center gap-3">
        <Icon className="size-6 text-signal" />
        <h2 className="font-display text-3xl font-black">{title}</h2>
      </div>
      <ol className="mt-4 grid gap-3">
        {items.map((item, index) => (
          <li className="grid grid-cols-[2.5rem_1fr] gap-3 border border-ink/12 bg-paper/70 p-4" key={item}>
            <span className="grid size-8 place-items-center rounded-full bg-civic font-display text-lg font-black text-paper">
              {index + 1}
            </span>
            <p className="font-semibold leading-7 text-ink/72">{item}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
