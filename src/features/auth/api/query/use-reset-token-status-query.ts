import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { ResetTokenStatusResponse } from "@/features/auth/api/types/password-recovery"

function fetchResetTokenStatus(token: string): Promise<ResetTokenStatusResponse> {
  return api.get("/sso-admin/resetTokenStatus", { params: { token } })
}

export const resetTokenStatusQueryKey = (token: string | undefined) => [
  "auth",
  "reset-token-status",
  token,
]

/**
 * Estado del enlace de reseteo. Se consulta una sola vez por token: la
 * cuenta regresiva la lleva el cliente a partir del `expiresIn` que devuelve
 * esta respuesta, sin repreguntar cada segundo.
 */
export function useResetTokenStatusQuery(token: string | undefined) {
  return useQuery({
    queryKey: resetTokenStatusQueryKey(token),
    queryFn: () => fetchResetTokenStatus(token!),
    enabled: !!token,
    staleTime: Infinity,
    retry: false,
  })
}
