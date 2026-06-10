import Link from "next/link"
import { notFound } from "next/navigation"
import { BadgeCheck, Clock, MailCheck, ShieldAlert, UserRound } from "lucide-react"
import {
  campaignWorkspaces,
  getConsentForPerson,
  getInteractionsForPerson,
  getPersonById
} from "@campaign-os/domain"

export default async function PersonDetailPage({
  params
}: {
  params: Promise<{ personId: string }>
}) {
  const { personId } = await params
  const person = getPersonById(personId)

  if (!person) {
    notFound()
  }

  const campaign = campaignWorkspaces.find((workspace) => workspace.id === person.campaignId)
  const interactions = getInteractionsForPerson(person.id)
  const consent = getConsentForPerson(person.id)

  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-ink/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link className="text-sm font-black uppercase tracking-[0.2em] text-civic" href="/admin/crm">
            CRM
          </Link>
          <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
            {person.firstName} {person.lastName}
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-ink/68">
            {campaign?.name ?? person.campaignId} · {person.city}, {person.state}
          </p>
        </div>
        <div className="bg-ink p-5 text-paper">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-field">Engagement score</p>
          <p className="mt-2 font-display text-5xl font-black">{person.engagementScore}</p>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 py-8 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="dossier-border bg-paper/82 p-6">
          <UserRound className="size-8 text-signal" />
          <h2 className="mt-5 font-display text-4xl font-black">Record summary</h2>
          <dl className="mt-6 grid gap-3">
            {[
              ["Email", person.email],
              ["Phone", person.phone],
              ["Kinds", person.kinds.map((kind) => kind.replaceAll("_", " ")).join(", ")],
              ["Last interaction", formatDate(person.lastInteractionAt)]
            ].map(([label, value]) => (
              <div className="border border-ink/12 bg-paper/70 p-4" key={label}>
                <dt className="text-xs font-black uppercase tracking-[0.18em] text-ink/46">{label}</dt>
                <dd className="mt-2 break-words font-black">{value}</dd>
              </div>
            ))}
          </dl>
        </aside>

        <article className="bg-ink p-6 text-paper shadow-dossier">
          <div className="flex items-center justify-between border-b border-paper/20 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-field">Interaction timeline</p>
              <h2 className="mt-2 font-display text-4xl font-black">Recent activity</h2>
            </div>
            <Clock className="size-8 text-signal" />
          </div>
          <div className="mt-6 grid gap-4">
            {interactions.map((interaction) => (
              <div className="border border-paper/15 bg-paper/[0.055] p-4" key={interaction.id}>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-field">
                  {interaction.type.replaceAll("_", " ")} · {interaction.channel.replaceAll("_", " ")}
                </p>
                <p className="mt-2 text-lg font-black">{formatDate(interaction.occurredAt)}</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-paper/66">{interaction.summary}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mx-auto max-w-7xl border-t border-ink/15 py-8">
        <div className="mb-5 flex items-center gap-3">
          <MailCheck className="size-6 text-civic" />
          <h2 className="font-display text-4xl font-black">Consent records</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {consent.map((record) => (
            <article className="dossier-border bg-paper/82 p-5" key={record.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">
                    {record.channel} · {record.purpose.replaceAll("_", " ")}
                  </p>
                  <h3 className="mt-3 text-xl font-black">{record.source}</h3>
                </div>
                {record.status === "granted" ? (
                  <BadgeCheck className="size-6 shrink-0 text-civic" />
                ) : (
                  <ShieldAlert className="size-6 shrink-0 text-signal" />
                )}
              </div>
              <p className="mt-4 text-sm font-semibold leading-6 text-ink/68">
                Status: {record.status} · Captured {formatDate(record.capturedAt)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value))
}
