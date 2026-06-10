import { z } from "zod"
import {
  campaignEvents,
  getEventsForCampaign,
  getMissionsForCampaign,
  getTrainingForCampaign,
  trainingModules,
  volunteerMissions
} from "@campaign-os/domain"
import { publicProcedure, router } from "../trpc"

export const volunteersRouter = router({
  events: publicProcedure.query(() => campaignEvents),
  missions: publicProcedure.query(() => volunteerMissions),
  training: publicProcedure.query(() => trainingModules),
  campaignOverview: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => ({
      events: getEventsForCampaign(input.campaignId),
      missions: getMissionsForCampaign(input.campaignId),
      training: getTrainingForCampaign(input.campaignId)
    }))
})
