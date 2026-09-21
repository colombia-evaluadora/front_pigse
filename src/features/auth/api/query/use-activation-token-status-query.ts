import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { ResetTokenStatusResponse } from "@/features/auth/api/types/password-recovery"

function fetchActivationTokenStatus(token: string): Promise<ResetTokenStatusResponse> {
  return api.get("/sso-admin/activationTokenStatus", { params: { token } })
}

export const activationTokenStatusQueryKey = (token: string | undefined) => [
  "auth",
  "activation-token-status",
  token,
]

/**
 * Estado del enlace de activación — mismo contrato y mismo motivo que
 * `useResetTokenStatusQuery`, contra `/activationTokenStatus` en vez de
 * `/resetTokenStatus`.
 */
export function useActivationTokenStatusQuery(token: string | undefined) {
  return useQuery({
    queryKey: activationTokenStatusQueryKey(token),
    queryFn: () => fetchActivationTokenStatus(token!),
    enabled: !!token,
    staleTime: Infinity,
    retry: false,
  })
}
