import { delay, http, HttpResponse } from "msw"

import { userActivityDb } from "@/mocks/db/user-activity"
import type { UserActivityRow } from "@/features/administration/user-activity/api/types/user-activity"
import type { UserActivityQueryRequest } from "@/features/administration/user-activity/api/query/use-user-activity-query"

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
}

function applyFilters(rows: UserActivityRow[], filters: UserActivityQueryRequest["filters"]): UserActivityRow[] {
  const termino = normalizar((filters.search ?? "").trim())
  return rows.filter(
    (row) =>
      (!termino ||
        normalizar(row.nombre).includes(termino) ||
        normalizar(row.identificacion).includes(termino) ||
        normalizar(row.correo).includes(termino) ||
        normalizar(row.establecimientoNombre ?? "").includes(termino)) &&
      (filters.establecimientoId == null || row.establecimientoId === filters.establecimientoId) &&
      (!filters.estado || row.estado === filters.estado),
  )
}

/** `POST /pigse/usuarios/actividad/query` (V495). Solo lectura. */
export const userActivityHandlers = [
  http.post("*/api/user-activity/query", async ({ request }) => {
    await delay(200)
    const body = (await request.json()) as UserActivityQueryRequest
    const filtered = applyFilters(userActivityDb, body.filters)
    const totalCount = filtered.length
    const safePageSize = Math.max(1, body.pageSize || 10)
    const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize))
    const start = Math.max(0, body.pageIndex || 0) * safePageSize
    const rows = filtered.slice(start, start + safePageSize)
    return HttpResponse.json({ rows, pageCount, totalCount })
  }),
]
