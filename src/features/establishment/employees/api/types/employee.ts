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
   * Roles del funcionario en su establecimiento (`pigse.TESTABLECIMIENTO_USUARIO`
   * vía `pigse.fn_fun_listar`) — a diferencia de CEVAL, PIGSE no tiene
   * concepto de "jornada" ni "estado" por permiso: un funcionario simplemente
   * tiene uno o más roles asignados en su establecimiento.
   */
  roles: CatalogItem[]
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
