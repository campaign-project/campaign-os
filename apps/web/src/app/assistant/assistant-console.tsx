"use client"

import { useMemo, useState } from "react"
import { ArrowRight, BadgeCheck, CircleAlert, Loader2 } from "lucide-react"
import type { AIProviderName } from "@campaign-os/ai"
import type { CampaignPolicy } from "@campaign-os/domain"

const sampleQuestions = [
  {
    label: "Supported",
    question: "How would this policy improve transparency?"
  },
  {
    label: "Implementation",
    question: "What implementation steps does this policy include?"
  },
  {
    label: "Refusal",
    question: "What is the campaign position on space mining?"
  }
]

type AssistantResult = {
  text: string
  refused: boolean
  provider: AIProviderName
  model: string
  citations: Array<{
    sourceId: string
    title: string
  }>
  provenance: {
    generatedAt: string
    humanApproved: boolean
    policyId: string | null
    sourceIds: string[]
  }
}

export function AssistantConsole({ policies }: { policies: CampaignPolicy[] }) {
  const [policySlug, setPolicySlug] = useState(policies[0]?.slug ?? "")
  const [provider, setProvider] = useState<AIProviderName>("mock")
  const [question, setQuestion] = useState("How would this policy improve transparency?")
  const [result, setResult] = useState<AssistantResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.slug === policySlug),
    [policies, policySlug]
  )

  async function askQuestion() {
    setLoading(true)
    setError(null)

    try {
      const input = encodeURIComponent(
        JSON.stringify({
          question,
          policySlug,
          provider
        })
      )
      const response = await fetch(`/api/trpc/ai.answerPolicyQuestion?input=${input}`)

      if (!response.ok) {
        throw new Error(`Request failed with ${response.status}`)
      }

      const payload = (await response.json()) as { result?: { data?: AssistantResult } }
      const data = payload.result?.data

      if (!data) {
        throw new Error("Assistant returned an empty response")
      }

      setResult(data)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown assistant error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.82fr_1.18fr]">
      <section className="dossier-border bg-paper/82 p-5 shadow-dossier">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-civic">Question</p>
        <h2 className="mt-2 font-display text-4xl font-black">Approved-source prompt</h2>

        <label className="mt-6 block">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-ink/50">Policy</span>
          <select
            className="mt-2 w-full border border-ink/20 bg-paper px-4 py-3 font-bold"
            value={policySlug}
            onChange={(event) => setPolicySlug(event.target.value)}
          >
            {policies.map((policy) => (
              <option key={policy.id} value={policy.slug}>
                {policy.title}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-ink/50">Provider</span>
          <select
            className="mt-2 w-full border border-ink/20 bg-paper px-4 py-3 font-bold"
            value={provider}
            onChange={(event) => setProvider(event.target.value as AIProviderName)}
          >
            <option value="mock">Mock approved-source provider</option>
            <option value="openai">OpenAI adapter placeholder</option>
            <option value="openrouter">OpenRouter adapter placeholder</option>
            <option value="local">Local model adapter placeholder</option>
          </select>
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-[0.18em] text-ink/50">Ask</span>
          <textarea
            className="mt-2 min-h-36 w-full resize-y border border-ink/20 bg-paper px-4 py-3 font-bold leading-7"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
          />
        </label>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {sampleQuestions.map((sample) => (
            <button
              className="border border-ink/15 bg-paper px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-ink/60 transition hover:bg-field hover:text-ink"
              key={sample.label}
              onClick={() => {
                setQuestion(sample.question)
                setResult(null)
                setError(null)
              }}
              type="button"
            >
              {sample.label}
            </button>
          ))}
        </div>

        <button
          className="group mt-5 flex w-full items-center justify-between bg-civic px-5 py-4 text-paper transition hover:bg-signal disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || !question.trim() || !policySlug}
          onClick={askQuestion}
          type="button"
        >
          <span className="text-sm font-black uppercase tracking-[0.2em]">
            {loading ? "Checking sources" : "Ask assistant"}
          </span>
          {loading ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <ArrowRight className="size-5 transition group-hover:translate-x-1" />
          )}
        </button>
      </section>

      <section className="bg-ink p-5 text-paper shadow-dossier">
        <div className="flex items-start justify-between gap-5 border-b border-paper/20 pb-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-field">Answer</p>
            <h2 className="mt-3 font-display text-4xl font-black leading-none">
              {selectedPolicy?.title ?? "Select a policy"}
            </h2>
          </div>
          {result?.refused ? (
            <CircleAlert className="size-8 shrink-0 text-signal" />
          ) : (
            <BadgeCheck className="size-8 shrink-0 text-field" />
          )}
        </div>

        {error ? (
          <p className="mt-6 border border-signal bg-signal/20 p-4 font-bold">{error}</p>
        ) : null}

        {result ? (
          <div className="mt-6 grid gap-4">
            <article className="border border-paper/15 bg-paper/[0.055] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-field">
                {result.refused ? "Refused" : "Source-backed answer"}
              </p>
              <p className="mt-3 text-lg font-semibold leading-8 text-paper/78">{result.text}</p>
            </article>

            <article className="border border-paper/15 bg-paper/[0.055] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-field">Citations</p>
              {result.citations.length > 0 ? (
                <div className="mt-3 grid gap-2">
                  {result.citations.map((citation) => (
                    <div className="border border-paper/15 p-3" key={citation.sourceId}>
                      <p className="font-black">{citation.title}</p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-paper/48">
                        {citation.sourceId}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm font-semibold text-paper/62">No citations returned.</p>
              )}
            </article>

            <article className="border border-paper/15 bg-paper/[0.055] p-5">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-field">Provenance</p>
              <dl className="mt-3 grid gap-2 text-sm font-bold text-paper/68">
                <div className="flex justify-between gap-4 border-t border-paper/10 pt-2">
                  <dt>Provider</dt>
                  <dd>{result.provider}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-paper/10 pt-2">
                  <dt>Model</dt>
                  <dd>{result.model}</dd>
                </div>
                <div className="flex justify-between gap-4 border-t border-paper/10 pt-2">
                  <dt>Human approved</dt>
                  <dd>{result.provenance.humanApproved ? "yes" : "no"}</dd>
                </div>
              </dl>
            </article>
          </div>
        ) : (
          <p className="mt-6 text-lg font-semibold leading-8 text-paper/62">
            Ask a question to see the assistant enforce approved-source citation behavior.
          </p>
        )}
      </section>
    </div>
  )
}
