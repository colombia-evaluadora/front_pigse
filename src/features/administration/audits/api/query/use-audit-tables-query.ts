import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import {
  DEFAULT_AUDIT_TABLE_ICON,
  sortWindow,
  toBind,
} from "@/features/administration/audits/api/real-mapping"
import type {
  AuditTable,
  AuditTablesQueryRequest,
  AuditTablesQueryResponse,
} from "@/features/administration/audits/api/types/audit-table"

interface UseAuditTablesQueryParams {
  filters: AuditTablesQueryRequest["filters"]
  sorting: AuditTablesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de V85 §1.1 — el catálogo derivado del nombre de tabla. */
interface RealAuditTableRow {
  slug: string
  name: string
  icon: string | null
  operationsToday: number
  totalCount: number
}

function toAuditTable(row: RealAuditTableRow): AuditTable {
  return {
    slug: row.slug,
    name: row.name,
    icon: row.icon ?? DEFAULT_AUDIT_TABLE_ICON,
    operationsToday: Number(row.operationsToday ?? 0),
    // El backend no tiene catálogo de campos legibles (V85, "simplificaciones
    // deliberadas"). La pantalla de operaciones los deriva de las columnas
    // reales que trae `entityFieldsRaw` — ver `TableOperationsDataTable`.
    fields: [],
  }
}

async function fetchAuditTables(
  params: UseAuditTablesQueryParams,
): Promise<AuditTablesQueryResponse> {
  const path = apiPath("/audit-tables/query", "/audit-tables/query", AUDIT_API_PREFIX)

  if (env.ENABLE_API_MOCKING) {
    return api.query(path, params)
  }

  // Solo las claves declaradas en `param_types` de la fila de catálogo: el
  // query-service rechaza con 400 cualquier placeholder de body sin tipo.
  const response = await api.query<RowsEnvelope<RealAuditTableRow>>(path, {
    filters: { name: toBind(params.filters.name) },
    sorting: "",
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  })
  const rawRows = unwrapRows(response)
  // V376 (sso): el servidor ya pagina de verdad -- esto es la página real.
  const totalCount = rawRows[0]?.totalCount ?? 0
  const rows = sortWindow(rawRows.map(toAuditTable), params.sorting)

  return {
    rows,
    pageCount: Math.max(1, Math.ceil(totalCount / params.pageSize)),
    totalCount,
  }
}

export const auditTablesQueryKey = (params: UseAuditTablesQueryParams) => ["audit-tables", params]

export function useAuditTablesQuery(params: UseAuditTablesQueryParams) {
  return useQuery({
    queryKey: auditTablesQueryKey(params),
    queryFn: () => fetchAuditTables(params),
    placeholderData: (previous) => previous,
    // Mismo criterio que `useAuditsQuery`: revalidar en cada entrada a la
    // pantalla en vez de confiar en el cache.
    staleTime: 0,
  })
}
