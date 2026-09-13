import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapRows, unwrapPaginated, type RowsEnvelope } from "@/lib/response-envelope"

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

/* ====================== vista de PIGSE-ADMINISTRADOR / PIGSE-SECRETARIA_TERRITORIAL ====================== */

export interface AllDocumentsQueryRequest {
  search: string
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface AllDocumentsQueryResponse {
  rows: Document[]
  pageCount: number
  totalCount: number
}

/** Fila cruda de `fn_documentos_listar_todos_paginado` (V368) — mismas
 * columnas que la fila de un solo EE, más el establecimiento dueño. */
interface RealAllDocumentRow {
  id: string
  type: string
  typeName: string
  status: string
  fileName: string | null
  uploadedAt: string | null
  sizeBytes: number | null
  archivoId: number | null
  downloadUrl: string | null
  establecimientoId: number
  establecimientoNombre: string
}

function toDocument(row: RealAllDocumentRow): Document {
  const { establecimientoId: _id, establecimientoNombre, ...rest } = row
  return { ...rest, establishmentName: establecimientoNombre } as Document
}

/**
 * Documentos de TODAS las instituciones (V368,
 * `fn_documentos_listar_todos_paginado`), paginado en el SERVIDOR — con
 * cientos de instituciones x 3 tipos, traer todo y paginar en el cliente
 * no escala (mismo criterio que ya se corrigió en Monitoreo y
 * Cumplimiento, ver `use-compliance.ts`). Solo para
 * PIGSE-ADMINISTRADOR/PIGSE-SECRETARIA_TERRITORIAL — `enabled` lo decide
 * quien llama, según el rol del usuario.
 */
async function fetchAllDocuments(
  params: AllDocumentsQueryRequest,
): Promise<AllDocumentsQueryResponse> {
  const path = apiPath("/documents/all/query", "/documentos/todos/query")

  if (env.ENABLE_API_MOCKING) {
    // Mock: no hay un catálogo separado de "todas las instituciones" —
    // se reusa el mismo listado de un EE (alcanza para desarrollo local;
    // el backend real es el que de verdad agrega todas las instituciones).
    const response = await api.get<{ rows: Document[] }>(apiPath("/documents", "/documentos"))
    return { rows: response.rows, pageCount: 1, totalCount: response.rows.length }
  }

  const body = {
    filters: { search: params.search },
    sorting: toSingleSort(params.sorting),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  }
  const response = await api.query(path, body)
  const result = unwrapPaginated<RealAllDocumentRow>(response)
  return { ...result, rows: result.rows.map(toDocument) }
}

export const allDocumentsQueryKey = (params: AllDocumentsQueryRequest) => [
  "documents",
  "all",
  params,
]

export function useAllDocumentsQuery(params: AllDocumentsQueryRequest, enabled: boolean) {
  return useQuery({
    queryKey: allDocumentsQueryKey(params),
    queryFn: () => fetchAllDocuments(params),
    enabled,
    placeholderData: (previous) => previous,
  })
}
