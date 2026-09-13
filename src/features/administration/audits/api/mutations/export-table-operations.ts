import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { AUDIT_EXPORT_UNAVAILABLE } from "@/features/administration/audits/api/real-mapping"
import type { ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"
import type { TableOperationsQueryRequest } from "@/features/administration/audits/api/types/audit-table"

interface ExportTableOperationsInput {
  tableSlug: string
  filters: TableOperationsQueryRequest["filters"]
  format: ExportFormat
}

function exportTableOperations({
  tableSlug,
  ...body
}: ExportTableOperationsInput): Promise<ExportResult> {
  // Sin endpoint de reportes de auditoría en el backend real — ver
  // AUDIT_EXPORT_UNAVAILABLE.
  if (!env.ENABLE_API_MOCKING) return Promise.resolve(AUDIT_EXPORT_UNAVAILABLE)

  return api.post(`/audit-tables/${tableSlug}/operations/export-all`, body)
}

interface UseExportTableOperationsOptions {
  mutationConfig?: MutationConfig<typeof exportTableOperations>
}

export function useExportTableOperations({ mutationConfig }: UseExportTableOperationsOptions = {}) {
  return useMutation({
    mutationFn: exportTableOperations,
    ...mutationConfig,
  })
}
