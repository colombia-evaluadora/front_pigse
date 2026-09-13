import { delay, http, HttpResponse } from "msw"

import {
  campusesDb,
  campusesRowsDb,
  deleteCampusDetails,
  deleteManyCampusDetails,
  takeNextCampusId,
  upsertCampusDetails,
} from "@/mocks/db/campuses"
import { establishmentsRowsDb } from "@/mocks/db/establishments"

import type {
  Campus,
  CampusesQueryRequest,
  CampusesQueryResponse,
} from "@/features/establishment/campuses/api/types/campus"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

// PIGSE no tiene la feature "academic-period" (CEVAL-only), pero el handler
// `*/api/eval-col/establecimientos/sedes/opciones` lo consume `useSedeOptionsQuery`
// cuando se cargan periodos académicos. Como PIGSE no tiene esa pantalla, el
// endpoint queda como compatibilidad para no romper mocks que sí lo invocan;
// el shape de la fila es el que devuelve `fn_sed_listar_todos` (V52).
interface SedeOptionRow {
  pk_sede: number
  codigo: string
  nombre: string
  fk_tlv_zona: number
  zona_nombre: string
  barrio: string
  comuna: string
  direccion: string
  telefono: string
  fk_establecimiento: number
}
interface SedesOptionsResponse {
  rows: SedeOptionRow[]
}

const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : []
}

function asIdArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : []
}

function parseCampusesRequest(body: Partial<CampusesQueryRequest> | null): CampusesQueryRequest {
  const pageIndex = Number(body?.pageIndex ?? 0)
  const pageSize = Number(body?.pageSize ?? 10)

  return {
    filters: {
      search: typeof body?.filters?.search === "string" ? body.filters.search : undefined,
      zones: asStringArray(body?.filters?.zones),
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

async function readCampusesRequestBody(request: Request) {
  try {
    return (await request.json()) as Partial<CampusesQueryRequest>
  } catch {
    return null
  }
}

function applyFilters(rows: Campus[], filters: CampusesQueryRequest["filters"]): Campus[] {
  return rows.filter((row) => {
    if (filters.search) {
      const needle = filters.search.toLowerCase()
      const matches =
        row.name.toLowerCase().includes(needle) ||
        row.dane.includes(needle)

      if (!matches) {
        return false
      }
    }

    // El `<Select>` del buscador manda `String(item.id)`, no el `code` (ver
    // search-campuses.tsx).
    if (filters.zones?.length && !filters.zones.includes(String(row.zone?.id ?? ""))) {
      return false
    }

    return true
  })
}

function sortValue(row: Campus, id: string) {
  return row[id as keyof Campus]
}

function applySorting(
  rows: Campus[],
  sorting: CampusesQueryRequest["sorting"]
): Campus[] {
  if (!sorting.length) {
    return rows
  }

  const [{ id, desc }] = sorting

  const sorted = [...rows].sort((a, b) => {
    const av = sortValue(a, id)
    const bv = sortValue(b, id)

    if (av === bv) {
      return 0
    }

    // `zone` puede ordenarse por su objeto completo (`CatalogItem | null`):
    // el `?? ""` solo evita el `TypeError` de comparar contra `null`, no
    // pretende un orden con sentido para esa columna.
    return (av ?? "") > (bv ?? "") ? 1 : -1
  })

  return desc ? sorted.reverse() : sorted
}

export const campusHandlers = [
  http.post("*/api/establishments/campuses/query", async ({ request }) => {
    await delay(250)

    const body = await readCampusesRequestBody(request)
    const { filters, sorting, pageIndex, pageSize } = parseCampusesRequest(body)

    const filtered = applySorting(applyFilters(campusesRowsDb, filters), sorting)
    const totalCount = filtered.length
    const safePageSize = pageSize > 0 ? pageSize : 10
    const pageCount = Math.max(1, Math.ceil(totalCount / safePageSize))
    const start = pageIndex * safePageSize
    const rows = filtered.slice(start, start + safePageSize)

    return HttpResponse.json<CampusesQueryResponse>({
      rows,
      pageCount,
      totalCount,
    })
  }),

  // Las exportaciones cuelgan de `/api/campuses/*`, no de
  // `/api/establishments/campuses/*`, tal como las pide el front.
  http.post("*/api/campuses/export", async ({ request }) => {
    await delay(600)

    const { ids, format } = (await request.json()) as {
      ids: number[]
      format: ExportFormat
    }

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${ids.length} sede(s) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.post("*/api/campuses/export-all", async ({ request }) => {
    await delay(600)

    const { filters, format } = (await request.json()) as {
      filters: CampusesQueryRequest["filters"]
      format: ExportFormat
    }

    const count = applyFilters(campusesRowsDb, filters).length

    return HttpResponse.json<ExportResult>({
      status: "ok",
      message: `${count} sede(s) exportada(s) a ${EXPORT_FORMAT_LABELS[format]}.`,
    })
  }),

  http.get("*/api/establishments/campuses/options", async () => {
    await delay(150)

    return HttpResponse.json({
      rows: campusesDb,
    })
  }),

  // El mismo catálogo de sedes, pero con la ruta y el DTO del backend real
  // (`fn_sed_listar_todos`, columnas de TSEDE en crudo). No es un duplicado
  // por gusto: `useSedeOptionsQuery` —el select de Sede del periodo
  // académico— pega derecho acá sin pasar por `apiPath`, así que sin este
  // handler la pantalla se quedaba sin sedes en modo mock (y el 401 del
  // request sin interceptar tumbaba la sesión entera). El handler legacy de
  // arriba sigue sirviendo al diálogo de permisos de funcionarios, que
  // todavía consume la forma `Campus`.
  http.get("*/api/eval-col/establecimientos/sedes/opciones", async () => {
    await delay(150)

    return HttpResponse.json<SedesOptionsResponse>({
      rows: campusesDb.map((campus, index) => ({
        pk_sede: campus.id,
        codigo: campus.dane,
        nombre: campus.name,
        fk_tlv_zona: campus.zone?.id ?? 0,
        zona_nombre: campus.zone?.name ?? "",
        barrio: campus.neighborhood,
        comuna: campus.commune,
        direccion: campus.address,
        telefono: campus.phone,
        // `Campus` no guarda a qué establecimiento pertenece; se reparten en
        // orden sobre los sembrados para que la relación sea estable entre
        // recargas y cada establecimiento tenga al menos una sede.
        fk_establecimiento:
          establishmentsRowsDb[index % establishmentsRowsDb.length]?.id ?? 0,
      })),
    })
  }),

  http.get("*/api/establishments/campuses/:id", async ({ params }) => {
    await delay(150)

    const id = Number(Array.isArray(params.id) ? params.id[0] : params.id)
    const campus = campusesDb.find((item) => item.id === id)

    if (!campus) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Sede no encontrada.",
        },
        { status: 404 }
      )
    }

    return HttpResponse.json({
      status: "ok",
      campus,
    })
  }),

  http.post("*/api/establishments/campuses", async ({ request }) => {
    await delay(250)

    // El cliente no manda `id`: lo asigna el backend.
    const values = (await request.json()) as Omit<Campus, "id">
    const campus: Campus = { ...values, id: takeNextCampusId() }

    const savedCampus = upsertCampusDetails(campus)

    return HttpResponse.json({
      status: "ok",
      message: "Sede creada.",
      campus: savedCampus,
    })
  }),

  http.put("*/api/establishments/campuses/:id", async ({ params, request }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id
    const campusId = idParam ? Number(idParam) : NaN

    if (!idParam || Number.isNaN(campusId)) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Identificador de sede inválido.",
        },
        { status: 400 }
      )
    }

    const existing = campusesDb.find((item) => item.id === campusId)

    if (!existing) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Sede no encontrada.",
        },
        { status: 404 }
      )
    }

    const values = (await request.json()) as Campus
    const campus: Campus = {
      ...values,
      id: campusId,
    }

    const savedCampus = upsertCampusDetails(campus)

    return HttpResponse.json({
      status: "ok",
      message: "Sede actualizada.",
      campus: savedCampus,
    })
  }),

  http.delete("*/api/establishments/campuses/bulk-delete", async ({ request }) => {
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
    deleteManyCampusDetails(uniqueIds)

    return HttpResponse.json({
      status: "ok",
      message: `${uniqueIds.length} sede(s) eliminada(s).`,
      deletedCount: uniqueIds.length,
    })
  }),

  http.delete("*/api/establishments/campuses/:id", async ({ params }) => {
    await delay(250)

    const idParam = Array.isArray(params.id) ? params.id[0] : params.id

    // Guard defensivo: la ruta `bulk-delete` está registrada antes para
    // que MSW no la confunda con `:id`, pero si el orden cambia seguimos
    // devolviendo 404 sin dejar pasar `id === "bulk-delete"`.
    if (!idParam || idParam === "bulk-delete") {
      return HttpResponse.json(
        {
          status: "error",
          message: "Sede no encontrada.",
        },
        { status: 404 }
      )
    }

    const id = Number(idParam)
    const campus = campusesDb.find((item) => item.id === id)

    if (!campus) {
      return HttpResponse.json(
        {
          status: "error",
          message: "Sede no encontrada.",
        },
        { status: 404 }
      )
    }

    deleteCampusDetails(id)

    return HttpResponse.json({
      status: "ok",
      message: "Sede eliminada.",
    })
  }),

]
