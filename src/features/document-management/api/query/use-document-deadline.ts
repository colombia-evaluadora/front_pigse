import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"

import type { DocumentDeadline } from "@/features/document-management/api/types/document-deadline"

/** `GET /pigse/documentos/fecha-limite` (V522) — fecha límite global +
 *  excepciones activas por establecimiento. */
async function fetchDocumentDeadline(): Promise<DocumentDeadline> {
  const path = apiPath("/documents/deadline", "/documentos/fecha-limite")
  if (env.ENABLE_API_MOCKING) {
    const response = await api.get<{ rows: DocumentDeadline[] }>(path)
    return response.rows[0] ?? { fechaLimite: null, excepciones: [] }
  }
  const response = await api.get<RowsEnvelope<DocumentDeadline>>(path)
  return unwrapRow(response)
}

export const documentDeadlineQueryKey = ["documents", "deadline"] as const

export function useDocumentDeadlineQuery() {
  return useQuery({
    queryKey: documentDeadlineQueryKey,
    queryFn: fetchDocumentDeadline,
  })
}
