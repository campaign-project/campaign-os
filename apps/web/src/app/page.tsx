import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ContactRound,
  FileSearch,
  LayoutDashboard,
  RadioTower,
  ShieldCheck,
  Users
} from "lucide-react"
import {
  campaignEvents,
  campaignPolicies,
  campaignWorkspaces,
  crmPeople,
  productPillars,
  volunteerMissions
} from "@campaign-os/domain"

const quickLaunch = [
  {
    href: "/assistant",
    label: "Best demo",
    title: "Try source-bound AI",
    detail: "Use Supported, then Refusal. You should see citations on one and a refusal on the other.",
    icon: Bot,
    tone: "dark"
  },
  {
    href: "/policies/open-government",
    label: "PolicyHub",
    title: "Inspect a policy dossier",
    detail: "Review implementation steps, success metrics, criticisms, and source citations.",
    icon: FileSearch,
    tone: "light"
  },
  {
    href: "/admin/crm/person-maya",
    label: "CRM",
    title: "Open a person record",
    detail: "See supporter context, interactions, consent records, and campaign ownership.",
    icon: ContactRound,
    tone: "light"
  },
  {
    href: "/campaigns/presidential-2028",
    label: "Workspace",
    title: "View an operating workspace",
    detail: "See CRM, missions, events, policies, and permissions in one campaign context.",
    icon: LayoutDashboard,
    tone: "light"
  }
]

const statusCards = [
  {
    label: "Campaigns",
    value: campaignWorkspaces.length,
    detail: "tenant workspaces",
    icon: Users
  },
  {
    label: "Policies",
    value: campaignPolicies.length,
    detail: "source-backed dossiers",
    icon: FileSearch
  },
  {
    label: "Missions",
    value: volunteerMissions.length,
    detail: "volunteer actions",
    icon: RadioTower
  },
  {
    label: "CRM",
    value: crmPeople.length,
    detail: "people records",
    icon: ContactRound
  }
]

const demoPath = [
  {
    title: "Ask a supported assistant question",
    href: "/assistant",
    detail: "Confirms the swappable mock model returns citations."
  },
  {
    title: "Ask an unsupported assistant question",
    href: "/assistant",
    detail: "Confirms the assistant refuses instead of improvising."
  },
  {
    title: "Open PolicyHub",
    href: "/policies",
    detail: "Shows the public source-backed publishing surface."
  },
  {
    title: "Open CRM",
    href: "/admin/crm",
    detail: "Shows the shared relationship spine for campaign work."
  }
]

export default function HomePage() {
  return (
    <main className="px-4 py-5 md:px-8 md:py-6 lg:px-10">
      <section className="mx-auto grid max-w-7xl gap-6 xl:grid-cols-[1fr_24rem]">
        <div className="surface overflow-hidden">
          <div className="grid gap-7 p-5 md:gap-8 md:p-8 lg:grid-cols-[1fr_18rem]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-civic/15 bg-civic/8 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-civic">
                <BadgeCheck className="size-4" />
                Working prototype
              </div>
              <h2 className="mt-5 max-w-3xl font-display text-[2.55rem] font-black leading-[0.95] md:text-7xl">
                Campaign infrastructure that knows where everything belongs.
              </h2>
              <p className="mt-5 max-w-2xl text-base font-semibold leading-7 text-ink/64 md:text-lg md:leading-8">
                CampaignOS is now a navigable prototype: source-bound AI, PolicyHub, VolunteerOS,
                events, campaign workspaces, admin operations, and CRM records are all reachable
                from the sidebar.
              </p>
              <div className="mt-7 grid gap-3 sm:flex sm:flex-wrap">
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-paper shadow-dossier transition hover:bg-signal"
                  href="/assistant"
                >
                  Try assistant <ArrowRight className="size-4" />
                </Link>
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white/70 px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-ink/70 transition hover:bg-field hover:text-ink"
                  href="/campaigns"
                >
                  Browse workspaces
                </Link>
              </div>
            </div>

            <aside className="quiet-panel p-5 text-paper">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-field">
                    Today&apos;s map
                  </p>
                  <h3 className="mt-2 font-display text-3xl font-black">What exists</h3>
                </div>
                <ShieldCheck className="size-8 text-field" />
              </div>
              <div className="mt-5 grid gap-3">
                {statusCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.045] p-3" key={card.label}>
                      <div className="grid size-10 place-items-center rounded-md bg-field text-ink">
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-black">{card.label}</p>
                        <p className="text-xs font-semibold text-paper/48">{card.detail}</p>
                      </div>
                      <p className="font-display text-3xl font-black">{card.value}</p>
                    </div>
                  )
                })}
              </div>
            </aside>
          </div>
        </div>

        <aside className="surface p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-civic">
                Guided route
              </p>
              <h3 className="mt-2 font-display text-3xl font-black">Try these first</h3>
            </div>
            <ClipboardCheck className="size-7 text-signal" />
          </div>
          <div className="mt-5 grid gap-3">
            {demoPath.map((item, index) => (
              <Link
                className="group grid grid-cols-[2rem_1fr] gap-3 rounded-lg border border-ink/10 bg-white/62 p-3 transition hover:border-civic/20 hover:bg-field/80"
                href={item.href}
                key={item.title}
              >
                <span className="grid size-8 place-items-center rounded-md bg-ink font-display text-lg font-black text-paper group-hover:bg-civic">
                  {index + 1}
                </span>
                <span>
                  <span className="block text-sm font-black">{item.title}</span>
                  <span className="mt-1 block text-sm font-semibold leading-5 text-ink/58">
                    {item.detail}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </aside>
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickLaunch.map((item) => {
          const Icon = item.icon
          const dark = item.tone === "dark"
          return (
            <Link
              className={`group min-h-56 rounded-lg border p-5 shadow-dossier transition ${
                dark
                  ? "border-ink bg-ink text-paper hover:bg-civic"
                  : "border-ink/10 bg-white/72 text-ink hover:border-civic/20 hover:bg-field/70"
              }`}
              href={item.href}
              key={item.href}
            >
              <div className="flex items-center justify-between">
                <p className={`text-xs font-black uppercase tracking-[0.16em] ${dark ? "text-field" : "text-civic"}`}>
                  {item.label}
                </p>
                <Icon className={dark ? "size-5 text-field" : "size-5 text-signal"} />
              </div>
              <h3 className="mt-8 font-display text-3xl font-black leading-none">{item.title}</h3>
              <p className={`mt-4 text-sm font-semibold leading-6 ${dark ? "text-paper/64" : "text-ink/60"}`}>
                {item.detail}
              </p>
              <div className={`mt-6 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] ${dark ? "text-paper/52" : "text-ink/46"}`}>
                Open <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </div>
            </Link>
          )
        })}
      </section>

      <section className="mx-auto mt-6 grid max-w-7xl gap-6 lg:grid-cols-[1fr_1fr]">
        <article className="surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-civic">
                Field pulse
              </p>
              <h3 className="mt-2 font-display text-3xl font-black">Upcoming work</h3>
            </div>
            <CalendarDays className="size-7 text-signal" />
          </div>
          <div className="mt-5 grid gap-3">
            {campaignEvents.slice(0, 3).map((event) => (
              <div className="rounded-lg border border-ink/10 bg-white/62 p-4" key={event.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-civic">
                      {event.type.replaceAll("_", " ")}
                    </p>
                    <h4 className="mt-2 text-lg font-black">{event.title}</h4>
                    <p className="mt-1 text-sm font-semibold text-ink/56">{event.location}</p>
                  </div>
                  <p className="rounded-md bg-ink px-2 py-1 text-xs font-black text-paper">
                    {event.rsvps}/{event.capacity}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-civic">
                Product modules
              </p>
              <h3 className="mt-2 font-display text-3xl font-black">What we&apos;re proving</h3>
            </div>
            <CheckCircle2 className="size-7 text-signal" />
          </div>
          <div className="mt-5 grid gap-3">
            {productPillars.slice(0, 4).map((pillar) => (
              <div className="rounded-lg border border-ink/10 bg-white/62 p-4" key={pillar.name}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-civic">
                      {pillar.kind}
                    </p>
                    <h4 className="mt-2 text-lg font-black">{pillar.name}</h4>
                  </div>
                  <BadgeCheck className="size-5 text-civic" />
                </div>
                <p className="mt-2 text-sm font-semibold leading-6 text-ink/58">{pillar.mission}</p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </main>
  )
}
