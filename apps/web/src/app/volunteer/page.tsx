import Link from "next/link"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  MapPinned,
  PhoneCall,
  ShieldAlert,
  Signal
} from "lucide-react"
import { campaignEvents, trainingModules, volunteerMissions } from "@campaign-os/domain"

const missionIcon = {
  onboarding: BadgeCheck,
  canvassing: MapPinned,
  phone_banking: PhoneCall,
  signature_gathering: ShieldAlert,
  event_support: CalendarDays,
  training: BadgeCheck
}

export default function VolunteerPage() {
  const featuredMissions = volunteerMissions.slice(0, 3)
  const nextEvents = campaignEvents.slice(0, 3)

  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="flex flex-col justify-between">
          <header className="border-b border-ink/15 pb-6">
            <p className="text-sm font-black uppercase tracking-[0.24em] text-civic">VolunteerOS</p>
            <h1 className="mt-3 font-display text-6xl font-black leading-[0.9] md:text-8xl">
              Field work, without staff bottlenecks.
            </h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-7 text-ink/68">
              Volunteers get one clear next action: train, call, canvass, gather signatures, support
              events, or escalate issues when field work needs staff attention.
            </p>
          </header>

          <div className="grid gap-3 py-6 md:grid-cols-3">
            {[
              ["Active missions", volunteerMissions.length],
              ["Upcoming events", campaignEvents.length],
              ["Training modules", trainingModules.length]
            ].map(([label, value]) => (
              <div className="dossier-border bg-paper/82 p-4" key={label as string}>
                <p className="font-display text-5xl font-black">{value}</p>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.18em] text-ink/50">
                  {label as string}
                </p>
              </div>
            ))}
          </div>

          <Link
            className="group mb-6 flex items-center justify-between bg-ink px-5 py-4 text-paper transition hover:bg-signal"
            href="/events"
          >
            <span className="text-sm font-black uppercase tracking-[0.2em]">Find an event</span>
            <ArrowRight className="size-5 transition group-hover:translate-x-1" />
          </Link>
        </div>

        <aside className="bg-ink p-5 text-paper shadow-dossier md:p-7">
          <div className="flex items-start justify-between gap-5 border-b border-paper/20 pb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-field">Mission queue</p>
              <h2 className="mt-3 font-display text-4xl font-black leading-none md:text-5xl">
                Next best actions
              </h2>
            </div>
            <Signal className="size-10 shrink-0 text-signal" />
          </div>

          <div className="mt-6 grid gap-4">
            {featuredMissions.map((mission) => {
              const Icon = missionIcon[mission.type]
              return (
                <article className="border border-paper/15 bg-paper/[0.055] p-4" key={mission.id}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-field">
                        {mission.type.replaceAll("_", " ")}
                      </p>
                      <h3 className="mt-2 text-2xl font-black">{mission.title}</h3>
                    </div>
                    <Icon className="size-6 shrink-0 text-signal" />
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-6 text-paper/66">{mission.goal}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-field px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-ink">
                      {mission.priority}
                    </span>
                    <span className="rounded-full border border-paper/20 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-paper/70">
                      {mission.offlineReady ? "offline ready" : "online"}
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        </aside>
      </section>

      <section className="mx-auto max-w-7xl border-t border-ink/15 py-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="font-display text-4xl font-black">Upcoming volunteer events</h2>
          <Link className="text-sm font-black uppercase tracking-[0.18em] text-civic" href="/events">
            View all
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {nextEvents.map((event) => (
            <article className="dossier-border bg-paper/82 p-5" key={event.id}>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-civic">
                {event.type.replaceAll("_", " ")}
              </p>
              <h3 className="mt-3 font-display text-3xl font-black">{event.title}</h3>
              <p className="mt-3 text-sm font-semibold leading-6 text-ink/64">{event.location}</p>
              <div className="mt-5 h-2 bg-ink/10">
                <div
                  className="h-2 bg-signal"
                  style={{ width: `${Math.min(100, Math.round((event.rsvps / event.capacity) * 100))}%` }}
                />
              </div>
              <p className="mt-3 text-sm font-black text-ink/60">
                {event.rsvps}/{event.capacity} RSVP slots filled
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
