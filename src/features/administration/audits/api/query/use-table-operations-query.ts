import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import {
  matchesFieldFilters,
  parseRawRow,
  sortWindow,
  toBind,
  toIsoDateTime,
  toOperationCh,
} from "@/features/administration/audits/api/real-mapping"
import type {
  OperationType,
  TableOperation,
  TableOperationsQueryRequest,
  TableOperationsQueryResponse,
} from "@/features/administration/audits/api/types/audit-table"

interface UseTableOperationsQueryParams {
  tableSlug: string
  filters: TableOperationsQueryRequest["filters"]
  sorting: TableOperationsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de V85 §1.3. */
interface RealTableOperationRow {
  id: string
  operation: OperationType | "SNAPSHOT"
  authorName: string | null
  authorAvatarUrl: string | null
  authorVerified: boolean | null
  ip: string | null
  entityName: string | null
  entityId: string | null
  occurredAt: string
  entityFieldsRaw: string | null
  totalCount: number
}

function toTableOperation(row: RealTableOperationRow): TableOperation {
  return {
    id: row.id,
    // El SQL ya mapea c/u/d → INSERT/UPDATE/DELETE; 'r' (snapshot inicial de
    // Debezium) queda excluido por el `operacion != 'r'` del WHERE.
    operation: row.operation as OperationType,
    authorName: row.authorName ?? "",
    // Sin equivalente en el dominio: el backend los devuelve fijos en
    // NULL/false (§4.3 del gap-analysis de auditoría).
    authorAvatarUrl: row.authorAvatarUrl ?? null,
    authorVerified: row.authorVerified ?? false,
    ip: row.ip ?? "",
    entityName: row.entityName ?? "",
    entityId: row.entityId ?? "",
    occurredAt: toIsoDateTime(row.occurredAt) ?? row.occurredAt,
    // JSON crudo de `fila_new` con los nombres de columna de Postgres: no hay
    // catálogo de etiquetas legibles todavía (V85, simplificaciones).
    entityFields: parseRawRow(row.entityFieldsRaw),
  }
}

async function fetchTableOperations(
  params: UseTableOperationsQueryParams,
): Promise<TableOperationsQueryResponse> {
  const { tableSlug, ...body } = params
  const path = apiPath(
    `/audit-tables/${tableSlug}/operations/query`,
    `/audit-tables/${tableSlug}/operations/query`,
    AUDIT_API_PREFIX,
  )

  if (env.ENABLE_API_MOCKING) {
    return api.query(path, body)
  }

  // Se empuja al backend todo lo que su fila de catálogo sabe filtrar; el
  // resto (varias operaciones a la vez, `fieldFilters`) se recorta después
  // sobre la ventana traída — ver `real-mapping.ts`.
  const response = await api.query<RowsEnvelope<RealTableOperationRow>>(path, {
    filters: {
      author: toBind(params.filters.author),
      operationCh: toOperationCh(params.filters.operations),
      occurredFrom: toBind(params.filters.occurredFrom),
      occurredTo: toBind(params.filters.occurredTo),
    },
    tableSlug,
    sorting: "",
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  })

  const operations = params.filters.operations
  const rawRows = unwrapRows(response)
  // V376 (sso): el servidor ya pagina de verdad -- esto es la página real.
  const totalCount = rawRows[0]?.totalCount ?? 0
  const rows = sortWindow(
    rawRows
      .map(toTableOperation)
      .filter((row) => !operations?.length || operations.includes(row.operation))
      .filter((row) => matchesFieldFilters(row.entityFields, params.filters.fieldFilters)),
    params.sorting,
  )

  return {
    rows,
    pageCount: Math.max(1, Math.ceil(totalCount / params.pageSize)),
    totalCount,
  }
}

export function useTableOperationsQuery(params: UseTableOperationsQueryParams) {
  return useQuery({
    queryKey: ["audit-tables", params.tableSlug, "operations", params],
    queryFn: () => fetchTableOperations(params),
    placeholderData: (previous) => previous,
    // Mismo criterio que `useAuditsQuery`: revalidar en cada entrada a la
    // pantalla en vez de confiar en el cache.
    staleTime: 0,
  })
}
