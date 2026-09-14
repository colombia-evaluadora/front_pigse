import type { CatalogItem } from "@/types/catalog"
import type { Permission } from "@/features/establishment/institution/api/types/permission"
import type { Person } from "@/features/establishment/employees/api/types/person"

export const EMPLOYEE_STATUSES = ["ACTIVE", "SUSPENDED"] as const

export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number]

export interface Employee {
  /** Ausente hasta que el backend lo asigna (POST /establishments/employees). */
  id?: number

  person: Person

  employeeClass: CatalogItem | null
  educationLevel: CatalogItem | null
  grade: CatalogItem | null
  highestEducationLevel: CatalogItem | null
  fundingSource: CatalogItem | null
  functionalPosition: CatalogItem | null
  employmentType: CatalogItem | null

  address: string

  permissions: Permission[]

  status: EmployeeStatus

  /**
   * Establecimiento y cargo del funcionario en PIGSE (`pigse.TFUNCIONARIO`,
   * `fn_fun_crear`/`fn_fun_actualizar`, V257/V369) — a diferencia de todos
   * los campos de arriba (CEVAL: clase/jornada/grado/nivel/fuente/cargo
   * funcional/vinculación/dirección/permisos por rol+jornada+estado, que NO
   * existen en el modelo de PIGSE, ver V365/V366), estos dos SÍ tienen
   * columna real en pigse.TFUNCIONARIO. Opcionales para no romper el flujo
   * de `add-establishment-page.tsx` (institution), que sigue construyendo
   * un `Employee` "vacío" para registrar rector/secretaria sin tocarlos.
   */
  establishment?: CatalogItem | null
  cargo?: CatalogItem | null
}

export interface EmployeeListItem {
  id: number
  documentNumber: string
  name: string
  establishmentName: string
  /**
   * Roles agregados a partir de los permisos del funcionario
   * (`pigse.fn_fun_listar`, V370, devuelve `permisos` como JSONB con
   * rol+sede+jornada+estado por fila). Se listan una sola vez por `idRole`,
   * conservando el orden de aparición.
   */
  roles: CatalogItem[]
  /** Nombres de sede (`permisos[].sede`), sin duplicados. */
  campuses: string[]
  /**
   * Jornadas agregadas desde los permisos, igual que `roles`: un funcionario
   * puede tener permisos en más de una jornada (mañana y tarde, por ejemplo),
   * así que la celda las lista separadas por comas.
   */
  workSchedules: CatalogItem[]
  /** Estados agregados desde los permisos, sin duplicados. */
  statuses: EmployeeStatus[]
}

export interface EmployeesQueryFilters {
  search?: string
  establecimientos?: number[]
}

export interface EmployeesQueryRequest {
  filters: EmployeesQueryFilters
  sorting: {
    id: string
    desc: boolean
  }[]
  pageIndex: number
  pageSize: number
}

export interface EmployeesQueryResponse {
  rows: EmployeeListItem[]
  pageCount: number
  totalCount: number
}
