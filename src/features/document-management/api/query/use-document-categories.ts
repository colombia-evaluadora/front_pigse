import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import type { DocumentCategory, DocumentType } from "@/features/document-management/api/types/document"

/**
 * `GET /pigse/documentos/:TIPO/categorias` (V512) — los 5 anexos fijos de
 * un PEI o PEC puntual. PMI no tiene categorías: no se llama con `PMI`
 * (el catálogo de rutas ya no ofrece "entrar" a PMI, ver `columns-documents.tsx`).
 */
async function fetchDocumentCategories(type: DocumentType): Promise<DocumentCategory[]> {
  const path = apiPath(`/documents/${type}/categories`, `/documentos/${type}/categorias`)
  if (env.ENABLE_API_MOCKING) {
    const response = await api.get<{ rows: DocumentCategory[] }>(path)
    return response.rows
  }
  const response = await api.get<RowsEnvelope<DocumentCategory>>(path)
  return unwrapRows(response)
}

export const documentCategoriesQueryKey = (type: DocumentType) => ["documents", type, "categories"] as const

export function useDocumentCategoriesQuery(type: DocumentType) {
  return useQuery({
    queryKey: documentCategoriesQueryKey(type),
    queryFn: () => fetchDocumentCategories(type),
  })
}
