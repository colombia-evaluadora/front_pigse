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
 * Normaliza los filtros de la UI a lo que espera el backend.
 *
 * Los `<Select>` del buscador mandan el id como TEXTO (`String(item.id)`),
 * pero los binds del catálogo están declarados `BIGINT[]` y el query-service
 * valida el tipo de cada elemento: un `["1"]` donde espera `[1]` se rechaza
 * con 400.
 *
 * Se exporta —y no queda embebido en el body de la consulta— porque la
 * exportación manda EXACTAMENTE los mismos filtros y tiene que aplicar la
 * misma conversión. Cuando esto vivía solo dentro del hook de listado, la
 * tabla funcionaba y el reporte fallaba con 400 sobre los mismos filtros.
 */
export function toCampusesQueryFilters(filters: CampusesQueryRequest["filters"]) {
  // `zones` viaja tal cual: desde V116 el backend filtra por CÓDIGO de zona,
  // no por id, así que convertir a número rompería el bind (VARCHAR[]).
  return { ...filters, zones: filters.zones ?? [] }
}

interface UseCampusesQueryParams {
  filters: CampusesQueryRequest["filters"]
  sorting: CampusesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de `fn_sed_listar_paginado` (V52) — a diferencia de
 * `fn_sed_listar_todos` (usado en el selector de sedes), esta versión
 * paginada NO trae `barrio`/`comuna`, solo lo que se ve en la tabla. */
interface RealCampusRow {
  pk_sede: number
  codigo: string
  nombre: string
  consecutivo: string
  fk_zona: number | null
  zona_nombre: string | null
  direccion: string | null
  telefono: string | null
}

function toCampus(row: RealCampusRow): Campus {
  return {
    id: row.pk_sede,
    name: row.nombre,
    dane: row.codigo ?? "",
    zone: row.fk_zona === null ? null : { id: row.fk_zona, code: "", name: row.zona_nombre ?? "" },
    // No vienen en este listado (ver comentario de RealCampusRow); solo se
    // completan al abrir el detalle/edición, que sí trae el objeto entero.
    neighborhood: "",
    commune: "",
    address: row.direccion ?? "",
    phone: row.telefono ?? "",
  }
}

async function fetchCampuses(params: CampusesQueryRequest): Promise<CampusesQueryResponse> {
  if (env.ENABLE_API_MOCKING) {
    const response = await api.query(
      apiPath("/establishments/campuses/query", "/establecimientos/sedes/query"),
      params,
    )
    return unwrapPaginated(response)
  }

  // El mock espera `sorting` como array tal cual; el backend real espera un
  // único objeto (o null) — ver `toSingleSort`.
  const body = {
    ...params,
    filters: toCampusesQueryFilters(params.filters),
    sorting: toSingleSort(params.sorting),
  }
  const response = await api.query(
    apiPath("/establishments/campuses/query", "/establecimientos/sedes/query"),
    body,
  )
  const result = unwrapPaginated<RealCampusRow>(response)
  return { ...result, rows: result.rows.map(toCampus) }
}

export const campusesQueryKey = (params: UseCampusesQueryParams) => [
  "campuses",
  params,
]

export function useCampusesQuery(params: UseCampusesQueryParams) {
  return useQuery({
    queryKey: campusesQueryKey(params),
    queryFn: () => fetchCampuses(params),
    placeholderData: (previous) => previous,
  })
}
