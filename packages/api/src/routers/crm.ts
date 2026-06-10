import { z } from "zod"
import {
  consentRecords,
  crmInteractions,
  crmPeople,
  getConsentForPerson,
  getInteractionsForPerson,
  getOrganizationsForCampaign,
  getPeopleForCampaign,
  getPersonById
} from "@campaign-os/domain"
import { publicProcedure, router } from "../trpc"

export const crmRouter = router({
  people: publicProcedure.query(() => crmPeople),
  interactions: publicProcedure.query(() => crmInteractions),
  consent: publicProcedure.query(() => consentRecords),
  campaignPeople: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => getPeopleForCampaign(input.campaignId)),
  campaignOrganizations: publicProcedure
    .input(z.object({ campaignId: z.string() }))
    .query(({ input }) => getOrganizationsForCampaign(input.campaignId)),
  personById: publicProcedure
    .input(z.object({ personId: z.string() }))
    .query(({ input }) => {
      const person = getPersonById(input.personId)

      if (!person) {
        return null
      }

      return {
        person,
        interactions: getInteractionsForPerson(input.personId),
        consent: getConsentForPerson(input.personId)
      }
    })
})
