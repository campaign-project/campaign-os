import type { CampaignRole } from "@campaign-os/domain"

export type TRPCContext = {
  request: Request
  activeUser: {
    id: string
    name: string
    role: CampaignRole
  }
}

export function createTRPCContext({ request }: { request: Request }): TRPCContext {
  return {
    request,
    activeUser: {
      id: "seed-user-adam",
      name: "CampaignOS Operator",
      role: "admin"
    }
  }
}
