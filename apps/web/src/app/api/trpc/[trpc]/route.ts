import { fetchRequestHandler } from "@trpc/server/adapters/fetch"
import { appRouter, createTRPCContext } from "@campaign-os/api"

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createTRPCContext({ request })
  })
}

export { handler as GET, handler as POST }
