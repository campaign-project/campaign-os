"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bot,
  CalendarDays,
  ContactRound,
  FileSearch,
  Home,
  LayoutDashboard,
  RadioTower,
  UsersRound
} from "lucide-react"

const navItems = [
  {
    href: "/",
    label: "Home",
    description: "Prototype map",
    icon: Home,
    group: "Start"
  },
  {
    href: "/assistant",
    label: "Assistant",
    description: "Approved-source AI",
    icon: Bot,
    group: "Public"
  },
  {
    href: "/policies",
    label: "PolicyHub",
    description: "Policies and citations",
    icon: FileSearch,
    group: "Public"
  },
  {
    href: "/volunteer",
    label: "VolunteerOS",
    description: "Missions and training",
    icon: RadioTower,
    group: "Field"
  },
  {
    href: "/events",
    label: "Events",
    description: "Mobilization calendar",
    icon: CalendarDays,
    group: "Field"
  },
  {
    href: "/campaigns",
    label: "Campaigns",
    description: "Tenant workspaces",
    icon: UsersRound,
    group: "Operations"
  },
  {
    href: "/admin",
    label: "Admin",
    description: "Operations desk",
    icon: LayoutDashboard,
    group: "Operations"
  },
  {
    href: "/admin/crm",
    label: "CRM",
    description: "People and consent",
    icon: ContactRound,
    group: "Operations"
  }
]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const activeItem =
    navItems.find((item) =>
      item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`)
    ) ?? navItems[0]
  const groups = Array.from(new Set(navItems.map((item) => item.group)))

  return (
    <div className="min-h-screen lg:pl-72">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 border-r border-white/10 bg-[#20211f] text-paper shadow-[18px_0_60px_rgba(32,33,31,0.2)] lg:flex lg:flex-col">
        <Link className="group flex items-center gap-3 border-b border-white/10 px-5 py-5" href="/">
          <div className="grid size-11 place-items-center rounded-lg bg-field text-ink shadow-[0_12px_30px_rgba(213,232,106,0.22)] transition group-hover:bg-signal group-hover:text-paper">
            <RadioTower className="size-5" />
          </div>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.2em]">CampaignOS</p>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-paper/46">
              Campaign cockpit
            </p>
          </div>
        </Link>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
          {groups.map((group) => (
            <div className="mb-5" key={group}>
              <p className="px-3 pb-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-field/70">
                {group}
              </p>
              <div className="grid gap-1">
                {navItems
                  .filter((item) => item.group === group)
                  .map((item) => (
                    <NavLink href={item.href} key={item.href} pathname={pathname}>
                      <item.icon className="size-4" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-black">{item.label}</span>
                        <span className="block truncate text-xs font-semibold text-paper/44">
                          {item.description}
                        </span>
                      </span>
                    </NavLink>
                  ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            className="group block rounded-lg border border-white/10 bg-white/[0.055] p-4 transition hover:border-field/30 hover:bg-field hover:text-ink"
            href="/assistant"
          >
            <p className="text-xs font-black uppercase tracking-[0.14em] text-field group-hover:text-ink/60">
              Best demo
            </p>
            <p className="mt-2 text-sm font-bold leading-5">
              Open Assistant, click Supported, then Refusal.
            </p>
          </Link>
        </div>
      </aside>

      <header className="mobile-topbar sticky top-0 z-40 px-4 py-3 lg:hidden">
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link className="flex items-center gap-3" href="/">
            <div className="mobile-brand-mark">
              <RadioTower className="size-5" />
            </div>
            <div>
              <p className="font-display text-xl font-black leading-none">CampaignOS</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-civic">
                {activeItem.label}
              </p>
            </div>
          </Link>
        </div>

        <nav className="mobile-nav" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavPill href={item.href} key={item.href} pathname={pathname}>
              <item.icon className="size-4" />
              {item.label}
            </NavPill>
          ))}
        </nav>
      </header>

      <div className="hidden border-b border-ink/10 bg-white/48 px-5 py-4 backdrop-blur-xl md:block md:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-1">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-civic">Current workspace</p>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="font-display text-3xl font-black leading-none text-ink md:text-4xl">
                {activeItem.label}
              </h1>
              <p className="mt-1 text-sm font-semibold text-ink/56">{activeItem.description}</p>
            </div>
            <Link
              className="inline-flex items-center rounded-lg border border-ink/10 bg-white/70 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-ink/62 shadow-sm transition hover:bg-field hover:text-ink"
              href="/"
            >
              Prototype map
            </Link>
          </div>
        </div>
      </div>
      <div className="pb-10">{children}</div>
    </div>
  )
}

function NavLink({
  children,
  href,
  pathname
}: {
  children: React.ReactNode
  href: string
  pathname: string
}) {
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      className={`grid grid-cols-[1.2rem_1fr] items-center gap-3 rounded-lg px-3 py-3 transition ${
        active
          ? "bg-field text-ink shadow-[0_12px_28px_rgba(0,0,0,0.2)]"
          : "text-paper/70 hover:bg-white/[0.07] hover:text-paper"
      }`}
      href={href}
    >
      {children}
    </Link>
  )
}

function NavPill({
  children,
  href,
  pathname
}: {
  children: React.ReactNode
  href: string
  pathname: string
}) {
  const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`)

  return (
    <Link
      className={`mobile-nav-item ${active ? "mobile-nav-item-active" : ""}`}
      href={href}
    >
      {children}
    </Link>
  )
}
