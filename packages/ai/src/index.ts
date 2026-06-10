import {
  getPolicySource,
  policySources,
  type CampaignPolicy,
  type PolicySource
} from "@campaign-os/domain"

export type AIProviderName = "mock" | "openai" | "openrouter" | "local"

export type GenerateTextRequest = {
  prompt: string
  system?: string
  sourcePolicy?: CampaignPolicy
}

export type GenerateTextResult = {
  provider: AIProviderName
  model: string
  text: string
  citations: Array<{
    sourceId: string
    title: string
  }>
  refused: boolean
}

export interface AIProvider {
  name: AIProviderName
  model: string
  generateText(request: GenerateTextRequest): Promise<GenerateTextResult>
}

export class MockApprovedSourceProvider implements AIProvider {
  name: AIProviderName = "mock"
  model = "approved-source-mock-v0"

  async generateText(request: GenerateTextRequest): Promise<GenerateTextResult> {
    const policy = request.sourcePolicy

    if (!policy) {
      return {
        provider: this.name,
        model: this.model,
        text: "I can only answer from an approved CampaignOS policy and its approved sources.",
        citations: [],
        refused: true
      }
    }

    const approvedSources = policy.citations
      .map((citation) => getPolicySource(citation.sourceId))
      .filter(isApprovedAISource)

    if (approvedSources.length === 0) {
      return {
        provider: this.name,
        model: this.model,
        text: "I cannot answer because this policy has no approved AI-allowed sources.",
        citations: [],
        refused: true
      }
    }

    const evidenceText = [
      policy.title,
      policy.summary,
      policy.issueArea,
      ...policy.implementation,
      ...policy.successMetrics,
      ...policy.criticisms.flatMap((item) => [item.criticism, item.response]),
      ...policy.citations.map((citation) => citation.claim)
    ].join(" ")

    if (!hasKeywordOverlap(request.prompt, evidenceText)) {
      return {
        provider: this.name,
        model: this.model,
        text: "I cannot answer that from the selected policy's approved sources. Add an approved source or ask a question grounded in this policy.",
        citations: [],
        refused: true
      }
    }

    return {
      provider: this.name,
      model: this.model,
      text: `${policy.title}: ${policy.summary} The implementation plan includes ${policy.implementation[0].toLowerCase()} Success will be judged by whether ${policy.successMetrics[0].toLowerCase()}`,
      citations: approvedSources.map((source) => ({
        sourceId: source.id,
        title: source.title
      })),
      refused: false
    }
  }
}

function isApprovedAISource(source: PolicySource | undefined): source is PolicySource {
  return Boolean(source && source.status === "approved" && source.allowedForAI)
}

function hasKeywordOverlap(prompt: string, evidenceText: string) {
  const promptTerms = tokenize(prompt)
  const evidenceTerms = new Set(tokenize(evidenceText))

  return promptTerms.some((term) => evidenceTerms.has(term))
}

function tokenize(value: string) {
  const stopwords = new Set([
    "about",
    "after",
    "again",
    "also",
    "campaign",
    "does",
    "from",
    "have",
    "into",
    "policy",
    "position",
    "that",
    "this",
    "what",
    "when",
    "where",
    "which",
    "will",
    "with",
    "would",
    "your"
  ])

  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 3 && !stopwords.has(term))
}

export function createAIProvider(provider: AIProviderName = "mock"): AIProvider {
  if (provider === "mock") {
    return new MockApprovedSourceProvider()
  }

  return {
    name: provider,
    model: `${provider}-adapter-not-configured`,
    async generateText() {
      return {
        provider,
        model: `${provider}-adapter-not-configured`,
        text: `${provider} is not configured yet. CampaignOS can keep the same provider interface when this adapter is implemented.`,
        citations: policySources
          .filter((source) => source.status === "approved" && source.allowedForAI)
          .slice(0, 1)
          .map((source) => ({ sourceId: source.id, title: source.title })),
        refused: true
      }
    }
  }
}
