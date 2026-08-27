import { delay, http, HttpResponse } from "msw"

import { complianceRowsDb, getComplianceMetrics } from "@/mocks/db/compliance"

import type { ComplianceMetrics, ComplianceRow } from "@/features/monitoring/api/types/compliance"

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
]
