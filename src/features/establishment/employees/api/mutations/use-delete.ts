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
 * PUT, no DELETE: es `fn_fun_baja_establecimiento` (baja lógica), pensado
 * como `PUT /establecimientos/funcionarios/:ID` — ver
 * postgres/pending/step4_funcionarios_listar_y_baja.sql (todavía sin
 * aplicar).
 */
function deleteEmployee(id: number): Promise<DeleteEmployeeResult> {
  const url = apiPath(`/establishments/employees/${id}`, `/establecimientos/funcionarios/${id}`)
  return env.ENABLE_API_MOCKING ? api.delete(url) : api.put(url)
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
