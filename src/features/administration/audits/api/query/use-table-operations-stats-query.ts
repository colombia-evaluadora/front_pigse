import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import { toBind } from "@/features/administration/audits/api/real-mapping"
import type {
  TableOperationsStats,
  TableOperationsStatsRequest,
} from "@/features/administration/audits/api/types/audit-table"

interface UseTableOperationsStatsQueryParams extends TableOperationsStatsRequest {
  tableSlug: string
}

async function fetchTableOperationsStats({
  tableSlug,
  ...body
}: UseTableOperationsStatsQueryParams): Promise<TableOperationsStats> {
  const path = apiPath(
    `/audit-tables/${tableSlug}/operations/stats`,
    `/audit-tables/${tableSlug}/operations/stats`,
    AUDIT_API_PREFIX,
  )

  if (env.ENABLE_API_MOCKING) {
    return api.query(path, body)
  }

  // V384: BODY.IDS (operationId "lsn-seq" separados por coma) tiene
  // prioridad sobre el rango de fechas en el backend -- las stats de la
  // selección ya reflejan lo marcado, no el total del rango.
  const response = await api.query<RowsEnvelope<TableOperationsStats>>(path, {
    ids: (body.ids ?? []).join(","),
    filters: {
      occurredFrom: toBind(body.filters?.occurredFrom),
      occurredTo: toBind(body.filters?.occurredTo),
    },
  })
  const row = unwrapRows(response)[0]
  return {
    inserts: Number(row?.inserts ?? 0),
    updates: Number(row?.updates ?? 0),
    deletes: Number(row?.deletes ?? 0),
  }
}

export function useTableOperationsStatsQuery(params: UseTableOperationsStatsQueryParams) {
  return useQuery({
    queryKey: ["audit-tables", params.tableSlug, "operations", "stats", params],
    queryFn: () => fetchTableOperationsStats(params),
    placeholderData: (previous) => previous,
    // Mismo criterio que useTableOperationsQuery (la lista que acompañan
    // estas tarjetas): sin esto, el staleTime global de 60s deja las
    // tarjetas Insert/Update/Delete mostrando números de hasta un minuto
    // atrás al volver a entrar a la pantalla, mientras la lista sí revalida.
    staleTime: 0,
  })
}
