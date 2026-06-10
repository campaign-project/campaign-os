import { z } from "zod"
import { campaignWorkspaces, hasPermission, type CampaignPermission } from "@campaign-os/domain"
import { publicProcedure, router } from "../trpc"

export const campaignsRouter = router({
  list: publicProcedure.query(() => campaignWorkspaces),
  byId: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => {
      return campaignWorkspaces.find((campaign) => campaign.id === input.campaignId) ?? null
    }),
  permission: publicProcedure
    .input(
      z.object({
        permission: z.custom<CampaignPermission>()
      })
    )
    .query(({ ctx, input }) => {
      return {
        role: ctx.activeUser.role,
        permission: input.permission,
        allowed: hasPermission(ctx.activeUser.role, input.permission)
      }
    })
})
