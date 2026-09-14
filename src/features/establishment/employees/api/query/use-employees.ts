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
 * El estado de un permiso en la UI es "ACTIVE"/"SUSPENDED"; en la base
 * (`pigse.TSEDE_USUARIO.TLV_ESTADO`, contra lo que matchea
 * `BODY.FILTERS.ESTADO`) es 'ACTIVO'/'INACTIVO'. Mismo mapeo que hace
 * `toEmployeeListItem` al leer, en la dirección contraria.
 */
const ESTADO_POR_ESTADO_UI: Record<EmployeeStatus, string> = {
  ACTIVE: "ACTIVO",
  SUSPENDED: "INACTIVO",
}

/**
 * Normaliza los filtros de la UI a lo que espera el backend real de PIGSE.
 *
 * Desde V386 `pigse.fn_fun_listar` declara, además de `BODY.FILTERS.SEARCH` y
 * `BODY.FILTERS.ESTABLECIMIENTOS`, los binds `BODY.FILTERS.ROL`,
 * `BODY.FILTERS.JORNADA` y `BODY.FILTERS.ESTADO` (`VARCHAR[]`): un funcionario
 * matchea si AL MENOS UNO de sus permisos activos coincide. Las claves son las
 * del `param_types` del query-service —singulares y en español—, no las del
 * estado de la UI: mandar `roles`/`workSchedules` devolvería 400 por
 * "placeholders sin tipo declarado".
 *
 * Rol y jornada viajan por NOMBRE (la función compara `public.role.name` y
 * `TLISTA_VALOR.NOMBRE`), no por id ni por código.
 *
 * Mismo formato de arreglo real (no cadena separada por comas) que el
 * `establecimientos` que ya existía.
 */
export function toEmployeesQueryFilters(filters: EmployeesQueryRequest["filters"]) {
  return {
    search: filters.search ?? "",
    establecimientos: filters.establecimientos ?? [],
    // `null`, no `[]`: un VARCHAR[] vacío serializa como el literal JSON
    // "[]", que Postgres rechaza al bindear ("malformed array literal") --
    // encontrado en vivo, rompía CADA carga sin filtro de rol/jornada/estado
    // activo (el caso por defecto). `null` es la otra rama que la función ya
    // acepta (`p_roles IS NULL OR CARDINALITY(p_roles) = 0`), y sí bindea
    // bien. `establecimientos` (arriba) es BIGINT[] y no le pasa esto.
    rol: filters.roles?.length ? filters.roles : null,
    jornada: filters.workSchedules?.length ? filters.workSchedules : null,
    estado: filters.statuses?.length
      ? filters.statuses.map((status) => ESTADO_POR_ESTADO_UI[status])
      : null,
  }
}

/**
 * Los filtros que acepta el REPORTE de funcionarios.
 *
 * Deliberadamente más angosto que el del listado: V386 agregó los binds nuevos
 * a la fila `/funcionarios/query` de `public.query`, pero la fila de reporte
 * del `reporting-service` quedó con su juego de tipos viejo. Mandarle
 * `rol`/`jornada`/`estado` la haría fallar con el 400 de "placeholders sin
 * tipo declarado" — o sea, la tabla andando y la exportación rota sobre
 * exactamente los mismos filtros.
 */
export function toEmployeesReportFilters(filters: EmployeesQueryRequest["filters"]) {
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
