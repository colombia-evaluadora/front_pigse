import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { AUDIT_EXPORT_UNAVAILABLE } from "@/features/administration/audits/api/real-mapping"
import type { ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"

interface ExportSelectedTableOperationsInput {
  tableSlug: string
  ids: string[]
  format: ExportFormat
}

function exportSelectedTableOperations({
  tableSlug,
  ...body
}: ExportSelectedTableOperationsInput): Promise<ExportResult> {
  // Sin endpoint de reportes de auditoría en el backend real — ver
  // AUDIT_EXPORT_UNAVAILABLE.
  if (!env.ENABLE_API_MOCKING) return Promise.resolve(AUDIT_EXPORT_UNAVAILABLE)

  return api.post(`/audit-tables/${tableSlug}/operations/export`, body)
}

interface UseExportSelectedTableOperationsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedTableOperations>
}

export function useExportSelectedTableOperations({
  mutationConfig,
}: UseExportSelectedTableOperationsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedTableOperations,
    ...mutationConfig,
  })
}
