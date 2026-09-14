import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { apiPath } from "@/lib/api-paths"
import { api } from "@/lib/api-client"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
  Establishment,
  EstablishmentsQueryRequest,
  EstablishmentsQueryResponse,
} from "@/features/establishment/institution/api/types/establishment"

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
export function toEstablishmentsQueryFilters(filters: EstablishmentsQueryRequest["filters"]) {
  // `pigse.fn_est_listar` (V387) NO declara ningun parametro de estado --
  // a diferencia de lo que asumia un comentario anterior aca, mandar
  // `status` (aunque sea `[]`) dispara el 400 de "placeholders sin tipo
  // declarado" en CADA carga de la tabla, encontrado en vivo. Se omite del
  // body hasta que el backend lo soporte.
  const { status: _status, ...rest } = filters
  return rest
}

interface UseEstablishmentsQueryParams {
  filters: EstablishmentsQueryRequest["filters"]
  sorting: EstablishmentsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de `fn_est_listar_paginado` (V53) — columnas sueltas en
 * snake_case, no el `Establishment` anidado/camelCase que espera la tabla. */
interface RealEstablishmentRow {
  pk_establecimiento: number
  codigo: string
  nombre: string
  fk_departamento: number
  departamento_nombre: string
  fk_municipio: number
  municipio_nombre: string
  // `fk_tlv_estado_establecimiento` es nullable en pigse.TESTABLECIMIENTO
  // (V387) -- un establecimiento sin estado asignado todavía manda null.
  fk_estado: number | null
  estado_nombre: string | null
}

function toEstablishment(row: RealEstablishmentRow): Establishment {
  return {
    id: row.pk_establecimiento,
    dane: row.codigo,
    name: row.nombre,
    department: row.departamento_nombre,
    municipality: row.municipio_nombre,
    status: row.fk_estado == null ? null : String(row.fk_estado),
    statusLabel: row.estado_nombre,
  }
}

async function fetchEstablishments(
  params: EstablishmentsQueryRequest,
): Promise<EstablishmentsQueryResponse> {
  if (env.ENABLE_API_MOCKING) {
    const response = await api.query(
      apiPath("/establishments/query", "/establecimientos/query"),
      params,
    )
    return unwrapPaginated(response)
  }

  // El mock espera `sorting` como array tal cual; el backend real espera
  // un único objeto (o null) — ver `toSingleSort`.
  const body = {
    filters: toEstablishmentsQueryFilters(params.filters),
    sorting: toSingleSort(params.sorting),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  }
  const response = await api.query(
    apiPath("/establishments/query", "/establecimientos/query"),
    body,
  )
  const result = unwrapPaginated<RealEstablishmentRow>(response)
  return { ...result, rows: result.rows.map(toEstablishment) }
}

export const establishmentsQueryKey = (params: UseEstablishmentsQueryParams) => [
  "establishments",
  params,
]

export function useEstablishmentsQuery(params: UseEstablishmentsQueryParams) {
  return useQuery({
    queryKey: establishmentsQueryKey(params),
    queryFn: () => fetchEstablishments(params),
    placeholderData: (previous) => previous,
  })
}
