import Link from "next/link"
import { CalendarCheck, MapPin, UsersRound } from "lucide-react"
import { campaignEvents, campaignWorkspaces } from "@campaign-os/domain"

export default function EventsPage() {
  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-ink/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-civic">Events</p>
          <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
            Mobilization calendar
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-ink/68">
            Events are where supporters become known volunteers: RSVP, check-in, role assignment,
            attendance capture, and post-event follow-up all flow into the CRM spine.
          </p>
        </div>
        <Link
          className="inline-flex items-center justify-center rounded-full bg-ink px-5 py-3 text-sm font-black uppercase tracking-[0.18em] text-paper transition hover:bg-signal"
          href="/volunteer"
        >
          Volunteer home
        </Link>
      </header>

      <section className="mx-auto grid max-w-7xl gap-4 py-8 lg:grid-cols-2">
        {campaignEvents.map((event) => {
          const campaign = campaignWorkspaces.find((workspace) => workspace.id === event.campaignId)
          return (
            <article className="dossier-border grid gap-5 bg-paper/82 p-5 shadow-dossier md:grid-cols-[1fr_auto]" key={event.id}>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">
                  {event.type.replaceAll("_", " ")}
                </p>
                <h2 className="mt-3 font-display text-4xl font-black leading-none">{event.title}</h2>
                <p className="mt-4 text-sm font-semibold leading-6 text-ink/64">
                  {campaign?.name ?? event.campaignId}
                </p>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  <EventMeta icon={CalendarCheck} label="Starts" value={formatEventDate(event.startsAt)} />
                  <EventMeta icon={MapPin} label="Location" value={event.location} />
                  <EventMeta icon={UsersRound} label="RSVPs" value={`${event.rsvps}/${event.capacity}`} />
                  <EventMeta icon={CalendarCheck} label="Status" value={event.status} />
                </div>
              </div>
              <div className="flex min-w-36 flex-col justify-between bg-ink p-4 text-paper">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-field">Fill rate</p>
                <p className="font-display text-5xl font-black">
                  {Math.round((event.rsvps / event.capacity) * 100)}%
                </p>
                <div className="mt-5 h-2 bg-paper/15">
                  <div
                    className="h-2 bg-signal"
                    style={{ width: `${Math.min(100, Math.round((event.rsvps / event.capacity) * 100))}%` }}
                  />
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

function EventMeta({
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
      <p className="font-black">{value}</p>
    </div>
  )
}

function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value))
}
