import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import {
  paginateWindow,
  sortWindow,
  tableNameToSlug,
  toBind,
  toIsoDateTime,
  toOperationCh,
} from "@/features/administration/audits/api/real-mapping"
import type {
  SessionOperation,
  SessionOperationsQueryRequest,
  SessionOperationsResponse,
} from "@/features/administration/audits/api/types/audit"
import type { OperationType } from "@/features/administration/audits/api/types/audit-table"

interface UseSessionOperationsQueryParams {
  sessionId: string
  filters: SessionOperationsQueryRequest["filters"]
  sorting: SessionOperationsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de V90 §2.4. */
interface RealSessionOperationRow {
  id: string
  /** Nombre CRUDO de la tabla Postgres (`tgrado`), no el slug de la UI. */
  tableSlug: string
  operation: OperationType | "SNAPSHOT"
  entityName: string | null
  entityId: string | null
  occurredAt: string
  totalCount: number
}

function toSessionOperation(row: RealSessionOperationRow): SessionOperation {
  return {
    id: row.id,
    // La query devuelve `tabla` tal cual; la UI rutea por slug (y con él
    // arma la URL del diálogo de cambios), así que se convierte acá con la
    // misma fórmula que usa el SQL de V85.
    tableSlug: tableNameToSlug(row.tableSlug),
    operation: row.operation as OperationType,
    entityName: row.entityName ?? "",
    entityId: row.entityId ?? "",
    occurredAt: toIsoDateTime(row.occurredAt) ?? row.occurredAt,
  }
}

async function fetchSessionOperations(
  params: UseSessionOperationsQueryParams,
): Promise<SessionOperationsResponse> {
  const path = apiPath(
    `/audits/sessions/${params.sessionId}/operations`,
    `/audits/sessions/${params.sessionId}/operations`,
    AUDIT_API_PREFIX,
  )

  if (env.ENABLE_API_MOCKING) {
    // El body lleva los filtros/sort/page, igual que el endpoint paginado
    // de operaciones por tabla.
    return api.query(path, params)
  }

  // `filters.tableSlug` no se empuja: el SQL lo compara con `tabla = ...`
  // (igualdad exacta contra el nombre crudo de Postgres) mientras que en la
  // UI es texto libre del buscador. Se resuelve acá, contra el slug ya
  // convertido, como un "contiene".
  const response = await api.query<RowsEnvelope<RealSessionOperationRow>>(path, {
    filters: {
      tableSlug: "",
      operationCh: toOperationCh(params.filters.operations),
      occurredFrom: toBind(params.filters.occurredFrom),
      occurredTo: toBind(params.filters.occurredTo),
    },
    sessionId: params.sessionId,
    sorting: "",
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  })

  const operations = params.filters.operations
  const tableSlug = params.filters.tableSlug?.trim().toLowerCase()
  const rows = unwrapRows(response)
    .map(toSessionOperation)
    .filter((row) => !operations?.length || operations.includes(row.operation))
    .filter((row) => !tableSlug || row.tableSlug.toLowerCase().includes(tableSlug))

  return paginateWindow(sortWindow(rows, params.sorting), params.pageIndex, params.pageSize)
}

export function useSessionOperationsQuery(params: UseSessionOperationsQueryParams) {
  return useQuery({
    queryKey: ["audits", "sessions", params.sessionId, "operations", params],
    queryFn: () => fetchSessionOperations(params),
    placeholderData: (previous) => previous,
    // Mismo criterio que `useAuditsQuery`: revalidar en cada entrada a la
    // pantalla en vez de confiar en el cache.
    staleTime: 0,
  })
}
