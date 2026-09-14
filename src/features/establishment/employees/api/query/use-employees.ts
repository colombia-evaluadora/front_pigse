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
 * Normaliza los filtros de la UI a lo que espera el backend real de PIGSE.
 *
 * `pigse.fn_fun_listar` (V368/query-service) solo declara
 * `BODY.FILTERS.SEARCH` y `BODY.FILTERS.ESTABLECIMIENTOS` en su
 * `param_types` — no tiene concepto de roles/jornadas como filtro. Mandar
 * `roles`/`workSchedules` (aunque sea `[]`) hace que el validador de
 * placeholders del query-service los vea como claves sin tipo declarado y
 * responda 400: "tiene placeholders sin tipo declarado: [BODY.FILTERS.ROLES,
 * BODY.FILTERS.WORKSCHEDULES]".
 */
export function toEmployeesQueryFilters(filters: EmployeesQueryRequest["filters"]) {
  return {
    search: filters.search ?? "",
    establecimientos: filters.establecimientos ?? [],
  }
}

interface UseEmployeesQueryParams {
  filters: EmployeesQueryRequest["filters"]
  sorting: EmployeesQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de `pigse.fn_fun_listar` (V370) — `permisos` es JSONB con
 * rol+sede+jornada+estado por fila (reemplaza el `roles` plano de V257/
 * V368, ver V370). */
interface RealEmployeeListRow {
  pk_funcionario: number
  pk_usuario: number
  identificacion: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  correo_electronico: string
  telefono: string | null
  fk_establecimiento: number
  establecimiento_nombre: string
  permisos: { id: number; idRole: number; nombre: string }[]
}

function toEmployeeListItem(row: RealEmployeeListRow): EmployeeListItem {
  const name = [row.primer_nombre, row.segundo_nombre, row.primer_apellido, row.segundo_apellido]
    .filter(Boolean)
    .join(" ")

  // Un funcionario puede tener el mismo rol en varias sedes -- se dedupe
  // por `idRole` para la columna "Rol" del listado.
  const rolesByCode = new Map<number, string>()
  for (const permiso of row.permisos ?? []) {
    if (!rolesByCode.has(permiso.idRole)) rolesByCode.set(permiso.idRole, permiso.nombre)
  }

  return {
    id: row.pk_funcionario,
    documentNumber: row.identificacion,
    name,
    establishmentName: row.establecimiento_nombre,
    roles: Array.from(rolesByCode, ([id, roleName]) => ({ id, code: "", name: roleName })),
  }
}

async function fetchEmployees(params: EmployeesQueryRequest): Promise<EmployeesQueryResponse> {
  if (env.ENABLE_API_MOCKING) {
    const response = await api.query(
      apiPath("/establishments/employees/query", "/funcionarios/query"),
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
    apiPath("/establishments/employees/query", "/funcionarios/query"),
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
