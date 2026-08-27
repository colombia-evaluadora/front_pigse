import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import type { MutationConfig } from "@/lib/react-query"

export interface DeleteEstablishmentResult {
  status: "ok" | "error"
  message: string
}

/**
 * PUT, no DELETE: no es un borrado real, es `fn_est_soft_delete` (ACTIVE=
 * FALSE) — el SSO real lo registra como `PUT /establecimientos/:ID`.
 */
function deleteEstablishment(id: number): Promise<DeleteEstablishmentResult> {
  const url = apiPath(`/establishments/${id}`, `/establecimientos/${id}`)
  return env.ENABLE_API_MOCKING ? api.delete(url) : api.put(url)
}

interface UseDeleteOptions {
  mutationConfig?: MutationConfig<typeof deleteEstablishment>
}

export function useDelete({ mutationConfig }: UseDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEstablishment,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["establishments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
