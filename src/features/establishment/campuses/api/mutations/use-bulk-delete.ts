import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

// Misma familia que `fn_fun_baja_establecimiento_bulk` (funcionarios,
// confirmado contra el backend real: no hay envelope `{status, message,
// deletedCount}`, cada id trae su propia fila). Se asume el mismo contrato
// acá (`fn_sed_soft_delete_bulk`) por la misma convención de nombres/ruta —
// pendiente confirmar contra una respuesta real (ver
// `summarizeEmployeeBulkDelete` en `employees/api/mutations/use-bulk-delete.ts`
// para el caso ya confirmado).
export interface BulkDeleteCampusRow {
  pk_sede: string
  status: string
}

export interface BulkDeleteCampusResult {
  rows: BulkDeleteCampusRow[]
}

/**
 * El SSO real registra esto como `PUT /establecimientos/sedes/bulk-delete`
 * (`fn_sed_soft_delete_bulk`, borrado lógico) con los ids en
 * `{ pks: [...] }`, no un array plano en el body de un DELETE.
 */
function bulkDeleteCampuses(ids: number[]): Promise<BulkDeleteCampusResult> {
  if (env.ENABLE_API_MOCKING) {
    // `api.delete(url, body)` no existe en la firma estándar de axios.
    return api.request<BulkDeleteCampusResult>({
      method: "DELETE",
      url: "/establishments/campuses/bulk-delete",
      data: ids,
    }) as unknown as Promise<BulkDeleteCampusResult>
  }
  return api.put("/eval-col/establecimientos/sedes/bulk-delete", { pks: ids })
}

export interface BulkDeleteCampusSummary {
  succeededCount: number
  failed: { id: string; reason: string }[]
}

export function summarizeCampusBulkDelete(
  result: BulkDeleteCampusResult
): BulkDeleteCampusSummary {
  const failed: BulkDeleteCampusSummary["failed"] = []
  let succeededCount = 0
  for (const row of result.rows) {
    if (row.status === "eliminado") {
      succeededCount += 1
    } else {
      const reason = row.status.startsWith("error:")
        ? row.status.slice("error:".length)
        : row.status
      failed.push({ id: row.pk_sede, reason })
    }
  }
  return { succeededCount, failed }
}

interface UseBulkDeleteOptions {
  mutationConfig?: MutationConfig<typeof bulkDeleteCampuses>
}

export function useBulkDelete({
  mutationConfig,
}: UseBulkDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteCampuses,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["campuses"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}