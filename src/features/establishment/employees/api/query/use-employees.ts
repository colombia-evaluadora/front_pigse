import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type {
  EmployeeListItem,
  EmployeeStatus,
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
 * V368, ver V370). Mismo shape que el `permisos` de
 * `fn_fun_buscar_por_pk` (ver `use-employee.ts`). */
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
  permisos: {
    id: number
    idRole: number
    nombre: string
    idSede: number
    sede: string
    idJornada: number
    jornada: string
    estado: "ACTIVO" | "INACTIVO"
  }[]
}

function toEmployeeListItem(row: RealEmployeeListRow): EmployeeListItem {
  const name = [row.primer_nombre, row.segundo_nombre, row.primer_apellido, row.segundo_apellido]
    .filter(Boolean)
    .join(" ")

  // Un funcionario puede tener el mismo rol/sede/jornada en varios permisos
  // -- se dedupe cada dimensión por su id, conservando el orden de aparición,
  // para las columnas "Rol", "Sede educativa", "Jornada" y "Estado".
  const rolesById = new Map<number, string>()
  const campusNames = new Set<string>()
  const workSchedulesById = new Map<number, string>()
  const statuses = new Set<EmployeeStatus>()

  for (const permiso of row.permisos ?? []) {
    if (!rolesById.has(permiso.idRole)) rolesById.set(permiso.idRole, permiso.nombre)
    if (permiso.sede) campusNames.add(permiso.sede)
    if (permiso.idJornada !== null && permiso.idJornada !== undefined) {
      if (!workSchedulesById.has(permiso.idJornada)) {
        workSchedulesById.set(permiso.idJornada, permiso.jornada)
      }
    }
    // Mismo mapeo que `use-employee.ts`: TSEDE_USUARIO.TLV_ESTADO es
    // 'ACTIVO'/'INACTIVO' y la UI habla "ACTIVE"/"SUSPENDED".
    statuses.add(permiso.estado === "ACTIVO" ? "ACTIVE" : "SUSPENDED")
  }

  return {
    id: row.pk_funcionario,
    documentNumber: row.identificacion,
    name,
    establishmentName: row.establecimiento_nombre,
    roles: Array.from(rolesById, ([id, roleName]) => ({ id, code: "", name: roleName })),
    campuses: Array.from(campusNames),
    workSchedules: Array.from(workSchedulesById, ([id, scheduleName]) => ({
      id,
      code: "",
      name: scheduleName,
    })),
    statuses: Array.from(statuses),
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
