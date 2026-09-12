import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import { buildChanges, parseRawRow } from "@/features/administration/audits/api/real-mapping"
import type {
  OperationChangesResponse,
  OperationType,
} from "@/features/administration/audits/api/types/audit-table"

interface UseOperationChangesQueryParams {
  tableSlug: string
  operationId: string
  showAll?: boolean
  enabled?: boolean
}

/** Fila cruda de V85 §1.4 — el diff campo a campo lo arma el cliente. */
interface RealOperationChangesRow {
  operationId: string
  operation: OperationType | "SNAPSHOT"
  entityName: string | null
  entityId: string | null
  beforeRaw: string | null
  afterRaw: string | null
  currentRaw: string | null
}

async function fetchOperationChanges({
  tableSlug,
  operationId,
  showAll,
}: UseOperationChangesQueryParams): Promise<OperationChangesResponse> {
  const path = apiPath(
    `/audit-tables/${tableSlug}/operations/${operationId}/changes`,
    `/audit-tables/${tableSlug}/operations/${operationId}/changes`,
    AUDIT_API_PREFIX,
  )

  if (env.ENABLE_API_MOCKING) {
    // GET: estamos leyendo un recurso específico (los cambios de una
    // operación), no ejecutando una acción.
    return api.get(path, { params: { showAll: showAll ?? false } })
  }

  // `showAll` no viaja: la fila de catálogo solo declara PARAM.SLUG y
  // PARAM.OPERATIONID, y el query-service rechaza con 400 cualquier
  // placeholder caller-controlled sin tipo. El backend manda SIEMPRE los tres
  // JSON completos, así que "solo los campos que cambiaron" se resuelve acá.
  const response = await api.get<RowsEnvelope<RealOperationChangesRow>>(path)
  const row = unwrapRows(response)[0]

  const before = parseRawRow(row?.beforeRaw)
  const after = parseRawRow(row?.afterRaw)
  const current = parseRawRow(row?.currentRaw)
  const changes = buildChanges(before, after, current)
  const changedFields = changes.filter((change) => change.before !== change.after).length

  return {
    operationId,
    operation: (row?.operation ?? "UPDATE") as OperationType,
    entityName: row?.entityName ?? "",
    entityId: row?.entityId ?? "",
    totalFields: changes.length,
    changedFields,
    changes: showAll ? changes : changes.filter((change) => change.before !== change.after),
  }
}

export function useOperationChangesQuery(params: UseOperationChangesQueryParams) {
  return useQuery({
    queryKey: [
      "audit-tables",
      params.tableSlug,
      "operations",
      params.operationId,
      "changes",
      { showAll: params.showAll ?? false },
    ],
    queryFn: () => fetchOperationChanges(params),
    enabled: params.enabled ?? true,
  })
}
