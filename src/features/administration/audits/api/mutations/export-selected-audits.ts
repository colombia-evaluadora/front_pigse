import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { AUDIT_EXPORT_UNAVAILABLE } from "@/features/administration/audits/api/real-mapping"
import type { ExportFormat, ExportResult } from "@/features/administration/audits/api/types/audit"

interface ExportSelectedAuditsInput {
  ids: string[]
  format: ExportFormat
}

function exportSelectedAudits(input: ExportSelectedAuditsInput): Promise<ExportResult> {
  // Sin endpoint de reportes de auditoría en el backend real — ver
  // AUDIT_EXPORT_UNAVAILABLE.
  if (!env.ENABLE_API_MOCKING) return Promise.resolve(AUDIT_EXPORT_UNAVAILABLE)

  return api.post("/audits/export", input)
}

interface UseExportSelectedAuditsOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedAudits>
}

export function useExportSelectedAudits({ mutationConfig }: UseExportSelectedAuditsOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedAudits,
    ...mutationConfig,
  })
}
