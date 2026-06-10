import { router } from "./trpc"
import { aiRouter } from "./routers/ai"
import { campaignsRouter } from "./routers/campaigns"
import { crmRouter } from "./routers/crm"
import { policiesRouter } from "./routers/policies"
import { volunteersRouter } from "./routers/volunteers"

export const appRouter = router({
  ai: aiRouter,
  campaigns: campaignsRouter,
  crm: crmRouter,
  policies: policiesRouter,
  volunteers: volunteersRouter
})

export type AppRouter = typeof appRouter
