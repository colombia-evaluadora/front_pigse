import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import type { Document } from "@/features/document-management/api/types/document"

/** Lista plana de documentos (vigentes por EE). Sin filtros ni paginación. */
async function fetchDocuments(): Promise<Document[]> {
  const path = apiPath("/documents", "/documentos")
  if (env.ENABLE_API_MOCKING) {
    const response = await api.get<{ rows: Document[] }>(path)
    return response.rows
  }
  const response = await api.get<RowsEnvelope<Document>>(path)
  return unwrapRows(response)
}

export const documentsQueryKey = ["documents"] as const

export function useDocumentsQuery() {
  return useQuery({
    queryKey: documentsQueryKey,
    queryFn: fetchDocuments,
  })
}
