import { delay, http, HttpResponse } from "msw"

import {
  complianceRowsDb,
  getComplianceDetail,
  getComplianceMetrics,
} from "@/mocks/db/compliance"

import type {
  ComplianceDocumentState,
  ComplianceMetrics,
  ComplianceRow,
  DocumentType,
} from "@/features/monitoring/api/types/compliance"
import type { ComplianceRowsQueryRequest } from "@/features/monitoring/api/query/use-compliance"

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

/** Igual que V524: el filtro acepta el `status` o el `estado` derivado. */
function coincideEstado(elegidos: string[] | undefined, state: ComplianceDocumentState) {
  return !elegidos?.length || elegidos.includes(state.status) || elegidos.includes(state.estado ?? "")
}

function coincidePlazo(elegidos: string[] | undefined, row: ComplianceRow) {
  if (!elegidos?.length) return true
  return (
    (elegidos.includes("VENCIDO") && row.plazo === "VENCIDO" && row.globalProgress < 100) ||
    (elegidos.includes("PRORROGA") && Boolean(row.tieneExcepcion)) ||
    (elegidos.includes("VIGENTE") && row.plazo === "VIGENTE") ||
    (elegidos.includes("SIN_FECHA") && row.plazo === "SIN_FECHA")
  )
}

function applyComplianceFilters(
  rows: ComplianceRow[],
  filters: ComplianceRowsQueryRequest["filters"],
): ComplianceRow[] {
  const termino = normalizar((filters.search ?? "").trim())
  return rows.filter(
    (row) =>
      (!termino ||
        normalizar(row.establishmentName).includes(termino) ||
        (row.establishmentCode ?? "").includes(termino) ||
        normalizar(row.municipio ?? "").includes(termino)) &&
      coincideEstado(filters.pei, row.pei) &&
      coincideEstado(filters.pec, row.pec) &&
      coincideEstado(filters.pmi, row.pmi) &&
      coincideEstado(filters.pfi, row.pfi) &&
      coincidePlazo(filters.plazo, row) &&
      (!filters.etnias || (filters.etnias === "S") === Boolean(row.etnoeducativo)),
  )
}

function sortRows(rows: ComplianceRow[], sorting: ComplianceRowsQueryRequest["sorting"]) {
  const [sort] = sorting ?? []
  if (!sort) return rows
  const key = sort.id as keyof ComplianceRow
  const dir = sort.desc ? -1 : 1
  return [...rows].sort((a, b) => {
    const left = a[key] ?? ""
    const right = b[key] ?? ""
    if (left === right) return a.establishmentName.localeCompare(b.establishmentName, "es")
    return (left > right ? 1 : -1) * dir
  })
}

/**
 * Endpoints del tablero "Monitoreo y cumplimiento" (rutas viejas en inglés,
 * ver `apiPath`):
 *
 * - `GET  /api/compliance/metrics`      → KPIs (`fn_cumplimiento_metricas`).
 * - `POST /api/compliance/rows/query`   → tablero paginado (V524).
 * - `GET  /api/compliance/establishments/:id/documents/:type` → detalle
 *   documental de un EE (V555.1).
 */
export const complianceHandlers = [
  http.get("*/api/compliance/metrics", async () => {
    await delay(180)
    return HttpResponse.json<ComplianceMetrics>(getComplianceMetrics())
  }),

  http.get("*/api/compliance/rows", async () => {
    await delay(200)
    return HttpResponse.json({ rows: complianceRowsDb })
  }),

  http.post("*/api/compliance/rows/query", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as ComplianceRowsQueryRequest
    const filtered = sortRows(applyComplianceFilters(complianceRowsDb, body.filters), body.sorting)
    const totalCount = filtered.length
    const safePageSize = Math.max(1, body.pageSize || 10)
    const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize))
    const start = Math.max(0, body.pageIndex || 0) * safePageSize
    const rows = filtered.slice(start, start + safePageSize)
    return HttpResponse.json({ rows, pageCount, totalCount })
  }),

  http.get("*/api/compliance/establishments/:id/documents/:type", async ({ params }) => {
    await delay(250)
    const type = String(params.type).toUpperCase()
    if (!["PEI", "PEC", "PMI", "PFI"].includes(type)) {
      return HttpResponse.json({ message: `Tipo de documento invalido: ${type}` }, { status: 400 })
    }
    const detail = getComplianceDetail(Number(params.id), type as DocumentType)
    if (!detail) {
      return HttpResponse.json(
        { message: "El establecimiento educativo no existe" },
        { status: 404 },
      )
    }
    return HttpResponse.json(detail)
  }),
]
