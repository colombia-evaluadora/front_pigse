import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { AUDIT_EXPORT_UNAVAILABLE } from "@/features/administration/audits/api/real-mapping"
import type { ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"

interface ExportSessionOperationsInput {
  sessionId: string
  ids: string[]
  format: ExportFormat
}

// Exporta el set seleccionado de operaciones de una sesión. Como el sheet
// no tiene filtros, el "export all" es simplemente pasar todos los ids.
function exportSessionOperations({
  sessionId,
  ...body
}: ExportSessionOperationsInput): Promise<ExportResult> {
  // Sin endpoint de reportes de auditoría en el backend real — ver
  // AUDIT_EXPORT_UNAVAILABLE.
  if (!env.ENABLE_API_MOCKING) return Promise.resolve(AUDIT_EXPORT_UNAVAILABLE)

  return api.post(`/audits/sessions/${sessionId}/operations/export`, body)
}

interface UseExportSessionOperationsOptions {
  mutationConfig?: MutationConfig<typeof exportSessionOperations>
}

export function useExportSessionOperations({
  mutationConfig,
}: UseExportSessionOperationsOptions = {}) {
  return useMutation({
    mutationFn: exportSessionOperations,
    ...mutationConfig,
  })
}
