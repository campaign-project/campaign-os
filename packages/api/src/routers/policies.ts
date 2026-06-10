import { z } from "zod"
import {
  campaignPolicies,
  getPoliciesForCampaign,
  getPolicySource,
  getPublishedPolicies,
  policySources
} from "@campaign-os/domain"
import { publicProcedure, router } from "../trpc"

export const policiesRouter = router({
  listPublished: publicProcedure.query(() => getPublishedPolicies()),
  byCampaign: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => getPoliciesForCampaign(input.campaignId)),
  bySlug: publicProcedure
    .input(z.object({ campaignId: z.string().optional(), slug: z.string() }))
    .query(({ input }) => {
      return (
        campaignPolicies.find((policy) => {
          if (policy.slug !== input.slug) {
            return false
          }

          return input.campaignId ? policy.campaignId === input.campaignId : true
        }) ?? null
      )
    }),
  sourceById: publicProcedure
    .input(z.object({ sourceId: z.string() }))
    .query(({ input }) => getPolicySource(input.sourceId) ?? null),
  sources: publicProcedure.query(() => policySources)
})
