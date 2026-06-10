import Link from "next/link"
import { ArrowRight, BadgeCheck, FileSearch, ShieldAlert } from "lucide-react"
import { campaignPolicies, campaignWorkspaces, getPolicySource } from "@campaign-os/domain"

export default function PoliciesPage() {
  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-ink/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-civic">PolicyHub</p>
          <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
            Source-backed policy
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-ink/68">
            Every public proposal carries version history, citations, implementation steps,
            success metrics, and known criticism responses.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-paper transition hover:bg-signal"
          href="/campaigns"
        >
          Workspaces
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 py-8 lg:grid-cols-3">
        {campaignPolicies.map((policy) => {
          const campaign = campaignWorkspaces.find((workspace) => workspace.id === policy.campaignId)
          const approvedCitationCount = policy.citations.filter((citation) => {
            const source = getPolicySource(citation.sourceId)
            return source?.status === "approved" && source.allowedForAI
          }).length

          return (
            <article className="dossier-border bg-paper/82 p-5 shadow-dossier" key={policy.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">
                    {policy.issueArea}
                  </p>
                  <h2 className="mt-3 font-display text-4xl font-black leading-none">
                    {policy.title}
                  </h2>
                </div>
                {approvedCitationCount === policy.citations.length ? (
                  <BadgeCheck className="size-7 shrink-0 text-civic" />
                ) : (
                  <ShieldAlert className="size-7 shrink-0 text-signal" />
                )}
              </div>

              <p className="mt-5 text-sm font-semibold leading-6 text-ink/68">{policy.summary}</p>

              <dl className="mt-6 grid grid-cols-2 gap-3">
                <div className="border border-ink/12 bg-paper/70 p-3">
                  <dt className="text-xs font-black uppercase tracking-[0.16em] text-ink/46">
                    Campaign
                  </dt>
                  <dd className="mt-2 text-base font-black">{campaign?.name ?? policy.campaignId}</dd>
                </div>
                <div className="border border-ink/12 bg-paper/70 p-3">
                  <dt className="text-xs font-black uppercase tracking-[0.16em] text-ink/46">
                    Version
                  </dt>
                  <dd className="mt-2 text-base font-black">v{policy.version}</dd>
                </div>
              </dl>

              <div className="mt-4 border-l-4 border-signal bg-ink p-4 text-paper">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-field">
                  Citation health
                </p>
                <p className="mt-2 text-lg font-black">
                  {approvedCitationCount}/{policy.citations.length} approved for AI
                </p>
              </div>

              <Link
                className="group mt-5 flex items-center justify-between bg-civic px-4 py-3 text-paper transition hover:bg-signal"
                href={`/policies/${policy.slug}`}
              >
                <span className="text-sm font-black uppercase tracking-[0.18em]">Read policy</span>
                <ArrowRight className="size-5 transition group-hover:translate-x-1" />
              </Link>
            </article>
          )
        })}
      </section>

      <section className="mx-auto max-w-7xl border-t border-ink/15 py-8">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            ["Approved sources only", "Public AI answers can use approved, AI-allowed source documents.", BadgeCheck],
            ["Citation validation", "Claims map to source IDs so generated answers can be checked deterministically.", FileSearch],
            ["Human approval", "Policy changes and public outputs remain review-gated before publication.", ShieldAlert]
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
