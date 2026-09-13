import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { AUDIT_EXPORT_UNAVAILABLE } from "@/features/administration/audits/api/real-mapping"
import type { AuditsQueryRequest, ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"

interface ExportAuditsInput {
  filters: AuditsQueryRequest["filters"]
  format: ExportFormat
}

function exportAudits(input: ExportAuditsInput): Promise<ExportResult> {
  // Sin endpoint de reportes de auditoría en el backend real — ver
  // AUDIT_EXPORT_UNAVAILABLE.
  if (!env.ENABLE_API_MOCKING) return Promise.resolve(AUDIT_EXPORT_UNAVAILABLE)

  return api.post("/audits/export-all", input)
}

interface UseExportAuditsOptions {
  mutationConfig?: MutationConfig<typeof exportAudits>
}

export function useExportAudits({ mutationConfig }: UseExportAuditsOptions = {}) {
  return useMutation({
    mutationFn: exportAudits,
    ...mutationConfig,
  })
}
