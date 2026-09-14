import { delay, http, HttpResponse } from "msw"

import {
  establishmentsDb,
  establishmentsRowsDb,
  deleteEstablishmentDetails,
  deleteManyEstablishmentDetails,
  upsertEstablishmentDetails,
} from "@/mocks/db/establishments"

import type {
  Establishment,
  EstablishmentDetails,
  EstablishmentStatus,
  EstablishmentsQueryRequest,
  EstablishmentsQueryResponse,
} from "@/features/establishment/institution/api/types/establishment"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/institution/api/types/export"

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.length > 0)
    : []
}

function asIdArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : []
}

function parseEstablishmentsRequest(
  body: Partial<EstablishmentsQueryRequest> | null,
): EstablishmentsQueryRequest {
  const pageIndex = Number(body?.pageIndex ?? 0)
  const pageSize = Number(body?.pageSize ?? 10)

  return {
    filters: {
      search: typeof body?.filters?.search === "string" ? body.filters.search : undefined,
      status: asStringArray(body?.filters?.status) as EstablishmentStatus[],
      department: asStringArray(body?.filters?.department),
      municipality: asStringArray(body?.filters?.municipality),
    },
    sorting: Array.isArray(body?.sorting)
      ? body.sorting
          .filter((sort) => typeof sort?.id === "string" && sort.id.length > 0)
          .map((sort) => ({
            id: sort.id,
            desc: Boolean(sort.desc),
          }))
      : [],
    pageIndex: Number.isNaN(pageIndex) ? 0 : pageIndex,
    pageSize: Number.isNaN(pageSize) ? 10 : pageSize,
  }
}

async function readEstablishmentsRequestBody(request: Request) {
  try {
    return (await request.json()) as Partial<EstablishmentsQueryRequest>
  } catch {
    return null
  }
}

function applyFilters(
  rows: Establishment[],
  filters: EstablishmentsQueryRequest["filters"],
): Establishment[] {
  return rows.filter((row) => {
    if (filters.search) {
      const needle = filters.search.toLowerCase()

      const matches =
        row.name.toLowerCase().includes(needle) ||
        row.dane.includes(needle) ||
        row.department.toLowerCase().includes(needle) ||
        row.municipality.toLowerCase().includes(needle)

      if (!matches) {
        return false
      }
    }

    if (filters.status?.length && (row.status == null || !filters.status.includes(row.status))) {
      return false
    }

    if (filters.department?.length && !filters.department.includes(row.department)) {
      return false
    }

    if (filters.municipality?.length && !filters.municipality.includes(row.municipality)) {
      return false
    }

    return true
  })
}

function sortValue(row: Establishment, id: string) {
  return row[id as keyof Establishment]
}

function applySorting(
  rows: Establishment[],
  sorting: EstablishmentsQueryRequest["sorting"],
): Establishment[] {
  if (!sorting.length) {
    return rows
  }

  const [{ id, desc }] = sorting

  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id) ?? ""
    const bv = sortValue(b, id) ?? ""

    if (av === bv) {
      return 0
    }

    return av > bv ? 1 : -1
  })

  return desc ? sorted.reverse() : sorted
}

export const establishmentHandlers = [
  // Universo completo (sin paginar) para selects. Ver `fn_est_listar_todos`
  // (V61) en el backend real.
  http.get("*/api/establishments/options", async () => {
    await delay(150)

    return HttpResponse.json({
      rows: establishmentsRowsDb.map((row) => ({ id: row.id, name: row.name })),
    })
  }),

  http.post("*/api/establishments/query", async ({ request }) => {
    await delay(250)

    const body = await readEstablishmentsRequestBody(request)
    const { filters, sorting, pageIndex, pageSize } = parseEstablishmentsRequest(body)

    const filtered = applySorting(applyFilters(establishmentsRowsDb, filters), sorting)

    const totalCount = filtered.length
    const safePageSize = pageSize > 0 ? pageSize : 10
    const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize))
    const start = pageIndex * safePageSize
    const rows = filtered.slice(start, start + safePageSize)

    return HttpResponse.json<EstablishmentsQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  http.post("*/api/establishments/export", async ({ request }) => {
    await delay(600)

    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} establecimiento(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("*/api/establishments/export-all", async ({ request }) => {
    await delay(600)

    const { filters, format } = (await request.json()) as {
      filters: EstablishmentsQueryRequest["filters"]
      format: ExportFormat
    }

    const count = applyFilters(establishmentsRowsDb, filters).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} establecimiento(s) exportado(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.get("*/api/establishments/:id", async ({ params }) => {
    await delay(150)

    const id = Number(Array.isArray(params.id) ? params.id[0] : params.id)
    const establishment = establishmentsDb.find((item) => item.id === id)

    if (!establishment) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Establecimiento no encontrado.",
        },
        { status: 404 },
      )
    }

    return HttpResponse.json({
      status: "ok",
      establishment,
    })
  }),

  http.post("*/api/establishments", async ({ request }) => {
    await delay(250)

    // El cliente no manda `id`: lo asigna el backend (acá, `upsertEstablishmentDetails`).
    const values = (await request.json()) as EstablishmentDetails

    const { details } = upsertEstablishmentDetails(values)

    return HttpResponse.json({
      status: "ok",
      message: "Establecimiento creado.",
      establishment: details,
    })
  }),

  http.put("*/api/establishments/:id", async ({ params, request }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const establishmentId = idParam ? Number(idParam) : NaN

    if (!idParam || Number.isNaN(establishmentId)) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Identificador de establecimiento inválido.",
        },
        { status: 400 },
      )
    }

    const existing = establishmentsDb.find((item) => item.id === establishmentId)

    if (!existing) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Establecimiento no encontrado.",
        },
        { status: 404 },
      )
    }

    const values = (await request.json()) as EstablishmentDetails
    const establishment: EstablishmentDetails = {
      ...values,
      id: establishmentId,
    }

    const { details } = upsertEstablishmentDetails(establishment)

    return HttpResponse.json({
      status: "ok",
      message: "Establecimiento actualizado.",
      establishment: details,
    })
  }),

  http.delete("*/api/establishments/bulk-delete", async ({ request }) => {
    await delay(250)

    let ids: unknown
    try {
      ids = await request.json()
    } catch {
      return HttpResponse.json(
        {
          status: "error",
          message: "Cuerpo inválido. Se esperaba una lista de identificadores.",
        },
        { status: 400 },
      )
    }

    if (!Array.isArray(ids) || ids.some((id) => typeof id !== "number")) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Se esperaba una lista de identificadores (números).",
        },
        { status: 400 },
      )
    }

    const uniqueIds = Array.from(new Set(asIdArray(ids)))
    deleteManyEstablishmentDetails(uniqueIds)

    return HttpResponse.json({
      status: "ok",
      message: `${uniqueIds.length} establecimiento(s) eliminado(s).`,
      deletedCount: uniqueIds.length,
    })
  }),

  http.delete("*/api/establishments/:id", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id

    // La ruta `/establishments/bulk-delete` está registrada antes para que
    // MSW no la confunda con `:id`, pero dejamos este guard por si el orden
    // cambia en el futuro.
    if (!idParam || idParam === "bulk-delete") {
      return HttpResponse.json(
        {
          status: "error",
          message: "Establecimiento no encontrado.",
        },
        { status: 404 },
      )
    }

    const id = Number(idParam)
    const establishment = establishmentsDb.find((item) => item.id === id)

    if (!establishment) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Establecimiento no encontrado.",
        },
        { status: 404 },
      )
    }

    deleteEstablishmentDetails(id)

    return HttpResponse.json({
      status: "ok",
      message: "Establecimiento eliminado.",
    })
  }),
]
