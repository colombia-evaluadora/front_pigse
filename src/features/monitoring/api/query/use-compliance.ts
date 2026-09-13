import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapRows, unwrapPaginated, type RowsEnvelope } from "@/lib/response-envelope"

import type {
  ComplianceFilters,
  ComplianceMetrics,
  ComplianceRow,
} from "@/features/monitoring/api/types/compliance"

/** KPIs del tablero: total EE y % de avance por documento. */
async function fetchComplianceMetrics(): Promise<ComplianceMetrics> {
  const path = apiPath("/compliance/metrics", "/cumplimiento/metricas")
  if (env.ENABLE_API_MOCKING) {
    return api.get<ComplianceMetrics>(path)
  }
  const response = await api.get<RowsEnvelope<ComplianceMetrics>>(path)
  return unwrapRows(response)[0]!
}

export interface ComplianceRowsQueryRequest {
  filters: ComplianceFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface ComplianceRowsQueryResponse {
  rows: ComplianceRow[]
  pageCount: number
  totalCount: number
}

/**
 * Detalle por EE, paginado en el SERVIDOR (`fn_cumplimiento_listar_paginado`,
 * V-cumplimiento). Reemplaza el `GET /cumplimiento/listar` + filtro/paginado
 * en el cliente que tenía esta pantalla -- con cientos de EE, traer el
 * universo entero en cada carga no escala. Mismo patrón que
 * `use-campuses.ts` (`unwrapPaginated`, `toSingleSort`).
 */
async function fetchComplianceRows(
  params: ComplianceRowsQueryRequest,
): Promise<ComplianceRowsQueryResponse> {
  const path = apiPath("/compliance/rows/query", "/cumplimiento/query")

  if (env.ENABLE_API_MOCKING) {
    const response = await api.query(path, params)
    return unwrapPaginated(response)
  }

  // El backend espera los tres arrays de estado como top-level BODY.FILTERS.*
  // (PEI/PEC/PMI) y sorting como un unico objeto -- ver toSingleSort.
  const body = {
    filters: {
      search: params.filters.search,
      pei: params.filters.pei,
      pec: params.filters.pec,
      pmi: params.filters.pmi,
    },
    sorting: toSingleSort(params.sorting),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  }
  const response = await api.query(path, body)
  return unwrapPaginated<ComplianceRow>(response)
}

export const complianceMetricsQueryKey = ["compliance", "metrics"] as const
export const complianceRowsQueryKey = (params: ComplianceRowsQueryRequest) => [
  "compliance",
  "rows",
  params,
]

export function useComplianceMetricsQuery() {
  return useQuery({
    queryKey: complianceMetricsQueryKey,
    queryFn: fetchComplianceMetrics,
  })
}

export function useComplianceRowsQuery(params: ComplianceRowsQueryRequest) {
  return useQuery({
    queryKey: complianceRowsQueryKey(params),
    queryFn: () => fetchComplianceRows(params),
    placeholderData: (previous) => previous,
  })
}
