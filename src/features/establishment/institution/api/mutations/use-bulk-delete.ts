import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

// Misma familia que `fn_fun_baja_establecimiento_bulk` (funcionarios,
// confirmado contra el backend real: no hay envelope `{status, message,
// deletedCount}`, cada id trae su propia fila). Se asume el mismo contrato
// acá (`fn_est_soft_delete_bulk`) por la misma convención de nombres/ruta —
// pendiente confirmar contra una respuesta real (ver
// `summarizeEmployeeBulkDelete` en `employees/api/mutations/use-bulk-delete.ts`
// para el caso ya confirmado).
export interface BulkDeleteEstablishmentRow {
  pk_establecimiento: string
  status: string
}

export interface BulkDeleteEstablishmentResult {
  rows: BulkDeleteEstablishmentRow[]
}

/**
 * El SSO real registra esto como `POST /establecimientos/bulk-delete`
 * (llama a `fn_est_soft_delete_bulk`, borrado lógico), con los ids en
 * `{ pks: [...] }` — no un array plano en el body de un DELETE como hace
 * el mock. El mock sigue esperando el array plano vía DELETE (no se tocó
 * ese handler); acá solo se resuelve distinto según el modo.
 */
function bulkDeleteEstablishments(ids: number[]): Promise<BulkDeleteEstablishmentResult> {
  if (env.ENABLE_API_MOCKING) {
    // `api.delete(url, body)` no existe en la firma estándar de axios.
    return api.request<BulkDeleteEstablishmentResult>({
      method: "DELETE",
      url: "/establishments/bulk-delete",
      data: ids,
    }) as unknown as Promise<BulkDeleteEstablishmentResult>
  }
  return api.post("/pigse/establecimientos/bulk-delete", { pks: ids })
}

export interface BulkDeleteEstablishmentSummary {
  succeededCount: number
  failed: { id: string; reason: string }[]
}

export function summarizeEstablishmentBulkDelete(
  result: BulkDeleteEstablishmentResult,
): BulkDeleteEstablishmentSummary {
  const failed: BulkDeleteEstablishmentSummary["failed"] = []
  let succeededCount = 0
  for (const row of result.rows) {
    if (row.status === "eliminado") {
      succeededCount += 1
    } else {
      const reason = row.status.startsWith("error:")
        ? row.status.slice("error:".length)
        : row.status
      failed.push({ id: row.pk_establecimiento, reason })
    }
  }
  return { succeededCount, failed }
}

interface UseBulkDeleteOptions {
  mutationConfig?: MutationConfig<typeof bulkDeleteEstablishments>
}

export function useBulkDelete({ mutationConfig }: UseBulkDeleteOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: bulkDeleteEstablishments,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["establishments"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
