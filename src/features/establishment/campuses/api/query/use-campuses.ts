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
 * Desde V386 `pigse.fn_sed_listar` declara, además de `BODY.FILTERS.SEARCH` y
 * `BODY.FILTERS.ESTABLECIMIENTO`, el bind `BODY.FILTERS.ZONA` (`VARCHAR[]`),
 * que compara contra el NOMBRE de la zona (`TLISTA_VALOR.NOMBRE`), no contra
 * el id. La clave es la del `param_types` del query-service —singular y en
 * español—, no la del estado de la UI: mandar `zones` devolvería 400 por
 * "placeholders sin tipo declarado".
 *
 * Mismo formato de arreglo real (no cadena separada por comas) que el resto
 * de los filtros del listado.
 */
export function toCampusesQueryFilters(filters: CampusesQueryRequest["filters"]) {
  return {
    search: filters.search ?? "",
    establecimiento: filters.establishmentId ?? undefined,
    // `null`, no `[]`: un VARCHAR[] vacío serializa como "[]" y Postgres lo
    // rechaza al bindear ("malformed array literal") -- rompía CADA carga
    // sin filtro de zona activo (el caso por defecto). `null` sí bindea bien
    // (`p_zonas IS NULL OR CARDINALITY(p_zonas) = 0`, la otra rama que la
    // función ya acepta).
    zona: filters.zones?.length ? filters.zones : null,
  }
}

/**
 * Los filtros que acepta el REPORTE de sedes.
 *
 * Más angosto que el del listado por la misma razón que en funcionarios: V386
 * agregó `BODY.FILTERS.ZONA` a la fila `/sedes/query`, pero la fila de reporte
 * del `reporting-service` quedó con su juego de tipos viejo y rechazaría la
 * clave nueva con 400.
 */
export function toCampusesReportFilters(filters: CampusesQueryRequest["filters"]) {
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
