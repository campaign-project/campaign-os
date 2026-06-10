import { z } from "zod"
import { createAIProvider } from "@campaign-os/ai"
import { campaignPolicies } from "@campaign-os/domain"
import { publicProcedure, router } from "../trpc"

const providerSchema = z.enum(["mock", "openai", "openrouter", "local"])

export const aiRouter = router({
  answerPolicyQuestion: publicProcedure
    .input(
      z.object({
        question: z.string().min(1),
        policySlug: z.string(),
        provider: providerSchema.default("mock")
      })
    )
    .query(async ({ input }) => {
      const policy = campaignPolicies.find((candidate) => candidate.slug === input.policySlug)
      const provider = createAIProvider(input.provider)
      const result = await provider.generateText({
        prompt: input.question,
        sourcePolicy: policy
      })

      return {
        question: input.question,
        policySlug: input.policySlug,
        policyTitle: policy?.title ?? null,
        ...result,
        provenance: {
          provider: result.provider,
          model: result.model,
          policyId: policy?.id ?? null,
          sourceIds: result.citations.map((citation) => citation.sourceId),
          generatedAt: new Date().toISOString(),
          humanApproved: false
        }
      }
    })
})
