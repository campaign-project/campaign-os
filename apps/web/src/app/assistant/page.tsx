import Link from "next/link"
import { Bot, FileSearch, ShieldCheck } from "lucide-react"
import { campaignPolicies } from "@campaign-os/domain"
import { AssistantConsole } from "./assistant-console"

export default function AssistantPage() {
  return (
    <main className="min-h-screen px-5 py-6 md:px-8">
      <header className="mx-auto flex max-w-7xl flex-col gap-5 border-b border-ink/15 pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link className="text-sm font-black uppercase tracking-[0.2em] text-civic" href="/">
            CampaignOS
          </Link>
          <h1 className="mt-3 font-display text-5xl font-black leading-none md:text-7xl">
            Policy assistant
          </h1>
          <p className="mt-5 max-w-2xl text-lg font-semibold leading-7 text-ink/68">
            A provider-swappable assistant that answers only from the selected policy and approved
            AI-allowed sources. Unsupported questions are refused instead of improvised.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Badge icon={Bot} label="Provider" value="swappable" />
          <Badge icon={FileSearch} label="Sources" value="approved" />
          <Badge icon={ShieldCheck} label="Publish" value="blocked" />
        </div>
      </header>

      <section className="mx-auto max-w-7xl py-8">
        <AssistantConsole policies={campaignPolicies.filter((policy) => policy.status === "published")} />
      </section>
    </main>
  )
}

function Badge({
  icon: Icon,
  label,
  value
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
}) {
  return (
    <div className="dossier-border bg-paper/82 p-4">
      <Icon className="mb-5 size-5 text-signal" />
      <p className="font-display text-2xl font-black">{value}</p>
      <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-ink/50">{label}</p>
    </div>
  )
}
