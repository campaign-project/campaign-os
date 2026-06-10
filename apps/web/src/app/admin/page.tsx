import {
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  FileText,
  ShieldCheck,
  UserRoundCheck
} from "lucide-react"
import Link from "next/link"
import { adminQueues } from "@campaign-os/domain"

const operations = [
  { label: "Policy sources approved", value: "18", icon: FileText },
  { label: "Volunteer missions active", value: "42", icon: UserRoundCheck },
  { label: "Events this week", value: "7", icon: CalendarCheck },
  { label: "AI drafts awaiting review", value: "9", icon: ShieldCheck }
]

export default function AdminPreviewPage() {
  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-ink/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-civic">CampaignOS Admin</p>
          <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
            Operations desk
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            className="inline-flex items-center justify-center rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-ink transition hover:bg-field"
            href="/assistant"
          >
            Assistant
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-ink transition hover:bg-field"
            href="/admin/crm"
          >
            CRM
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-ink transition hover:bg-field"
            href="/volunteer"
          >
            VolunteerOS
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-ink transition hover:bg-field"
            href="/policies"
          >
            PolicyHub
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-ink/20 bg-paper px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-ink transition hover:bg-field"
            href="/campaigns"
          >
            Workspaces
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-paper transition hover:bg-signal"
            href="/"
          >
            Public preview
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 py-8 md:grid-cols-4">
        {operations.map((item) => {
          const Icon = item.icon
          return (
            <article className="dossier-border bg-paper/78 p-5" key={item.label}>
              <div className="mb-10 flex items-center justify-between">
                <Icon className="size-6 text-civic" />
                <CheckCircle2 className="size-5 text-signal" />
              </div>
              <p className="font-display text-5xl font-black">{item.value}</p>
              <p className="mt-2 text-sm font-black uppercase tracking-[0.16em] text-ink/56">
                {item.label}
              </p>
            </article>
          )
        })}
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 md:grid-cols-[0.9fr_1.1fr]">
        <article className="bg-ink p-6 text-paper shadow-dossier">
          <div className="flex items-center justify-between border-b border-paper/20 pb-5">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-field">
                Risk register
              </p>
              <h2 className="mt-2 font-display text-4xl font-black">Needs staff attention</h2>
            </div>
            <AlertTriangle className="size-8 text-signal" />
          </div>
          <div className="mt-6 grid gap-4">
            {adminQueues.map((queue) => (
              <div className="border border-paper/15 bg-paper/[0.055] p-4" key={queue.name}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black">{queue.name}</h3>
                    <p className="mt-2 text-sm font-semibold leading-6 text-paper/64">{queue.summary}</p>
                  </div>
                  <span className="rounded-full bg-signal px-3 py-1 text-sm font-black text-paper">
                    {queue.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="dossier-border bg-paper/82 p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">MVP Build Order</p>
          <h2 className="mt-2 font-display text-4xl font-black">Foundation before breadth</h2>
          <ol className="mt-8 grid gap-4">
            {[
              "Tenant core: campaigns, users, memberships, RBAC, audit log.",
              "CRM spine: people, organizations, relationships, interactions, consent.",
              "PolicyHub: policies, versions, source documents, citations.",
              "Approved-source AI assistant with validation and refusal behavior.",
              "Volunteer events, missions, training gates, and PWA field screens."
            ].map((step, index) => (
              <li className="grid grid-cols-[3rem_1fr] gap-4" key={step}>
                <span className="grid size-10 place-items-center rounded-full bg-civic font-display text-xl font-black text-paper">
                  {index + 1}
                </span>
                <p className="border-b border-ink/15 pb-4 text-lg font-bold leading-7">{step}</p>
              </li>
            ))}
          </ol>
        </article>
      </section>
    </main>
  )
}
