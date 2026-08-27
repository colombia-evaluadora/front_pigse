import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"

import type { ComplianceMetrics, ComplianceRow } from "@/features/monitoring/api/types/compliance"

/** KPIs del tablero: total EE y % de avance por documento. */
async function fetchComplianceMetrics(): Promise<ComplianceMetrics> {
  const path = apiPath("/compliance/metrics", "/cumplimiento/metricas")
  if (env.ENABLE_API_MOCKING) {
    return api.get<ComplianceMetrics>(path)
  }
  const response = await api.get<RowsEnvelope<ComplianceMetrics>>(path)
  return unwrapRows(response)[0]!
}

/** Lista plana de EE con el estado documental por PEI/PEC/PMI. */
async function fetchComplianceRows(): Promise<ComplianceRow[]> {
  const path = apiPath("/compliance/rows", "/cumplimiento/listar")
  if (env.ENABLE_API_MOCKING) {
    const response = await api.get<{ rows: ComplianceRow[] }>(path)
    return response.rows
  }
  const response = await api.get<RowsEnvelope<ComplianceRow>>(path)
  return unwrapRows(response)
}

export const complianceMetricsQueryKey = ["compliance", "metrics"] as const
export const complianceRowsQueryKey = ["compliance", "rows"] as const

export function useComplianceMetricsQuery() {
  return useQuery({
    queryKey: complianceMetricsQueryKey,
    queryFn: fetchComplianceMetrics,
  })
}

export function useComplianceRowsQuery() {
  return useQuery({
    queryKey: complianceRowsQueryKey,
    queryFn: fetchComplianceRows,
  })
}
