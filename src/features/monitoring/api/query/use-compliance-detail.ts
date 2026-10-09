import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"

import type {
  ComplianceDocumentDetail,
  DocumentType,
} from "@/features/monitoring/api/types/compliance"

/**
 * `GET /pigse/cumplimiento/establecimientos/:id/documentos/:tipo` (V555.1):
 * estado, plazo y anexos (con sus archivos) de un tipo documental de
 * CUALQUIER establecimiento. Existe porque `/documentos/:tipo/categorias`
 * resuelve el EE del token y los roles del tablero no tienen uno.
 */
async function fetchComplianceDetail(
  establishmentId: number,
  type: DocumentType,
): Promise<ComplianceDocumentDetail> {
  const path = apiPath(
    `/compliance/establishments/${establishmentId}/documents/${type}`,
    `/cumplimiento/establecimientos/${establishmentId}/documentos/${type}`,
  )
  if (env.ENABLE_API_MOCKING) {
    return api.get<ComplianceDocumentDetail>(path)
  }
  const response = await api.get<RowsEnvelope<ComplianceDocumentDetail>>(path)
  const row = unwrapRow(response)
  // La columna JSONB puede llegar como texto según el driver: se normaliza
  // acá para que la UI siempre reciba el array.
  const categorias =
    typeof row.categorias === "string" ? JSON.parse(row.categorias) : (row.categorias ?? [])
  return { ...row, categorias }
}

export const complianceDetailQueryKey = (establishmentId: number, type: DocumentType) =>
  ["compliance", "detail", establishmentId, type] as const

export function useComplianceDetailQuery(
  establishmentId: number | null | undefined,
  type: DocumentType | null | undefined,
) {
  return useQuery({
    queryKey: complianceDetailQueryKey(establishmentId ?? 0, type ?? "PEI"),
    queryFn: () => fetchComplianceDetail(establishmentId as number, type as DocumentType),
    enabled: establishmentId != null && establishmentId > 0 && type != null,
  })
}
