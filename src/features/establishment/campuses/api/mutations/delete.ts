import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import type { MutationConfig } from "@/lib/react-query"

export interface DeleteCampusResult {
  status: "ok" | "error"
  message: string
}

/**
 * PUT, no DELETE: es `fn_sed_soft_delete` (ACTIVE=FALSE), registrado en el
 * SSO real como `PUT /establecimientos/sedes/:ID`.
 */
function deleteCampus(id: number): Promise<DeleteCampusResult> {
  const url = apiPath(`/establishments/campuses/${id}`, `/establecimientos/sedes/${id}`)
  return env.ENABLE_API_MOCKING ? api.delete(url) : api.put(url)
}

interface UseDeleteOptions {
  mutationConfig?: MutationConfig<typeof deleteCampus>
}

export function useDelete({ mutationConfig }: UseDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCampus,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["campuses"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}