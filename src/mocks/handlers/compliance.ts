import { delay, http, HttpResponse } from "msw"

import { complianceRowsDb, getComplianceMetrics } from "@/mocks/db/compliance"

import type { ComplianceMetrics, ComplianceRow } from "@/features/monitoring/api/types/compliance"
import type { ComplianceRowsQueryRequest } from "@/features/monitoring/api/query/use-compliance"

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

function applyComplianceFilters(
  rows: ComplianceRow[],
  filters: ComplianceRowsQueryRequest["filters"],
): ComplianceRow[] {
  const termino = normalizar((filters.search ?? "").trim())
  const coincideEstado = (elegidos: string[], estado: string) =>
    !elegidos?.length || elegidos.includes(estado)

  return rows.filter(
    (row) =>
      (!termino || normalizar(row.establishmentName).includes(termino)) &&
      coincideEstado(filters.pei, row.pei.status) &&
      coincideEstado(filters.pec, row.pec.status) &&
      coincideEstado(filters.pmi, row.pmi.status),
  )
}

/**
 * Endpoints del tablero "Monitoreo y cumplimiento":
 *
 * - `GET /api/compliance/metrics`     → KPIs del encabezado (totales + % por documento).
 * - `GET /api/compliance/rows`        → lista plana de EE con su estado documental
 *                                       (lo que alimenta la tabla "Detalle por EE").
 *
 * En el backend real ambos viven detrás del query-service
 * (`fn_cumplimiento_metricas` + `fn_cumplimiento_listar`). Acá los
 * derivamos directo del `complianceRowsDb`.
 */
export const complianceHandlers = [
  http.get("*/api/compliance/metrics", async () => {
    await delay(180)
    return HttpResponse.json<ComplianceMetrics>(getComplianceMetrics())
  }),

  http.get("*/api/compliance/rows", async () => {
    await delay(200)
    return HttpResponse.json({ rows: complianceRowsDb as ComplianceRow[] })
  }),

  // Paginado real (mock): mismo shape que fn_cumplimiento_listar_paginado
  // ({rows, pageCount, totalCount}) — ver use-compliance.ts.
  http.post("*/api/compliance/rows/query", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as ComplianceRowsQueryRequest
    const filtered = applyComplianceFilters(complianceRowsDb as ComplianceRow[], body.filters)
    const totalCount = filtered.length
    const safePageSize = Math.max(1, body.pageSize || 10)
    const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize))
    const start = Math.max(0, body.pageIndex || 0) * safePageSize
    const rows = filtered.slice(start, start + safePageSize)
    return HttpResponse.json({ rows, pageCount, totalCount })
  }),
]
