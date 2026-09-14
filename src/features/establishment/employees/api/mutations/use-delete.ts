import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import type { MutationConfig } from "@/lib/react-query"

export interface DeleteEmployeeResult {
  status: "ok" | "error"
  message: string
}

/**
 * PATCH, no PUT: `PUT /funcionarios/:ID` es el update integral
 * (`fn_fun_actualizar`, ver `update.ts`) — la baja lógica real es
 * `pigse.fn_fun_soft_delete`, registrada como `PATCH /funcionarios/:ID`
 * (V257/V258), sin body (solo toma el `:PARAM.ID` de la URL).
 */
function deleteEmployee(id: number): Promise<DeleteEmployeeResult> {
  const url = apiPath(`/establishments/employees/${id}`, `/funcionarios/${id}`)
  return env.ENABLE_API_MOCKING ? api.delete(url) : api.patch(url)
}

interface UseDeleteOptions {
  mutationConfig?: MutationConfig<typeof deleteEmployee>
}

export function useDelete({ mutationConfig }: UseDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteEmployee,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
