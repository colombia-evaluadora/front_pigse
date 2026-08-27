import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
  EmployeeListItem,
  EmployeesQueryRequest,
  EmployeesQueryResponse,
} from "@/features/establishment/employees/api/types/employee"

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
export function toEmployeesQueryFilters(filters: EmployeesQueryRequest["filters"]) {
  // Viajan tal cual: desde V116 el backend filtra por CÓDIGO de rol y de
  // jornada, no por id, así que convertirlos a número rompería los binds
  // (VARCHAR[]).
  return {
    ...filters,
    roles: filters.roles ?? [],
    workSchedules: filters.workSchedules ?? [],
  }
}

interface UseEmployeesQueryParams {
  filters: EmployeesQueryRequest["filters"]
  sorting: EmployeesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de `fn_usu_empleados_listar_paginado` (V51) — `roles` es JSONB
 * `[{id, nombre}]`; `estados_permisos` es JSONB `["ACTIVO", ...]` (el dominio
 * de `TLV_ESTADO`, no "ACTIVE"/"SUSPENDED"). */
interface RealEmployeeListRow {
  pk_empleado: number
  numero_documento: string
  nombre_completo: string
  fk_estado: string
  estado_label: string
  jornada_id: number | null
  jornada_nombre: string | null
  roles: { id: number; nombre: string }[]
  estados_permisos: string[]
}

function toEmployeeListItem(row: RealEmployeeListRow): EmployeeListItem {
  return {
    id: row.pk_empleado,
    documentNumber: row.numero_documento,
    name: row.nombre_completo,
    roles: (row.roles ?? []).map((role) => ({ id: role.id, code: "", name: role.nombre })),
    workSchedules:
      row.jornada_id === null
        ? []
        : [{ id: row.jornada_id, code: "", name: row.jornada_nombre ?? "" }],
    statuses: (row.estados_permisos ?? []).map((estado) =>
      estado === "ACTIVO" ? "ACTIVE" : "SUSPENDED",
    ),
  }
}

async function fetchEmployees(params: EmployeesQueryRequest): Promise<EmployeesQueryResponse> {
  if (env.ENABLE_API_MOCKING) {
    const response = await api.query(
      apiPath("/establishments/employees/query", "/establecimientos/funcionarios/query"),
      params,
    )
    return unwrapPaginated(response)
  }

  // El mock espera `sorting` como array tal cual; el backend real espera un
  // único objeto (o null) — ver `toSingleSort`.
  const body = {
    filters: toEmployeesQueryFilters(params.filters),
    sorting: toSingleSort(params.sorting),
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  }
  const response = await api.query(
    apiPath("/establishments/employees/query", "/establecimientos/funcionarios/query"),
    body,
  )
  const result = unwrapPaginated<RealEmployeeListRow>(response)
  return { ...result, rows: result.rows.map(toEmployeeListItem) }
}

export const employeesQueryKey = (params: UseEmployeesQueryParams) => ["employees", params]

export function useEmployeesQuery(params: UseEmployeesQueryParams) {
  return useQuery({
    queryKey: employeesQueryKey(params),
    queryFn: () => fetchEmployees(params),
    placeholderData: (previous) => previous,
  })
}
