import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
  Campus,
  CampusesQueryRequest,
  CampusesQueryResponse,
} from "@/features/establishment/campuses/api/types/campus"

/**
 * `pigse.fn_sed_listar` (V370/V371) solo declara `BODY.FILTERS.SEARCH` y
 * `BODY.FILTERS.ESTABLECIMIENTO` -- sin filtro por zona (a diferencia de
 * CEVAL). Mandar `zones` dispara el 400 de "placeholders sin tipo
 * declarado" (mismo bug que `/funcionarios/query`).
 */
export function toCampusesQueryFilters(filters: CampusesQueryRequest["filters"]) {
  return {
    search: filters.search ?? "",
    establecimiento: filters.establishmentId ?? undefined,
  }
}

interface UseCampusesQueryParams {
  filters: CampusesQueryRequest["filters"]
  sorting: CampusesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de `pigse.fn_sed_listar` (V370/V371). */
interface RealCampusRow {
  pk_sede: number
  codigo: string
  nombre: string
  consecutivo: string
  fk_zona: number | null
  zona_nombre: string | null
  fk_establecimiento: number
  establecimiento_nombre: string
  direccion: string | null
  telefono: string | null
}

function toCampus(row: RealCampusRow): Campus {
  return {
    id: row.pk_sede,
    name: row.nombre,
    dane: row.codigo ?? "",
    zone: row.fk_zona === null ? null : { id: row.fk_zona, code: "", name: row.zona_nombre ?? "" },
    // No vienen en este listado (mismo criterio que CEVAL): solo se
    // completan al abrir el detalle/edición.
    neighborhood: "",
    commune: "",
    address: row.direccion ?? "",
    phone: row.telefono ?? "",
  }
}

async function fetchCampuses(params: CampusesQueryRequest): Promise<CampusesQueryResponse> {
  if (env.ENABLE_API_MOCKING) {
    const response = await api.query(apiPath("/establishments/campuses/query", "/sedes/query"), params)
    return unwrapPaginated(response)
  }

  const body = {
    filters: toCampusesQueryFilters(params.filters),
    sorting: toSingleSort(params.sorting),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  }
  const response = await api.query(apiPath("/establishments/campuses/query", "/sedes/query"), body)
  const result = unwrapPaginated<RealCampusRow>(response)
  return { ...result, rows: result.rows.map(toCampus) }
}

export const campusesQueryKey = (params: UseCampusesQueryParams) => ["campuses", params]

export function useCampusesQuery(params: UseCampusesQueryParams) {
  return useQuery({
    queryKey: campusesQueryKey(params),
    queryFn: () => fetchCampuses(params),
    placeholderData: (previous) => previous,
  })
}
