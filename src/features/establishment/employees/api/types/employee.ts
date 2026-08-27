import type { CatalogItem } from "@/types/catalog"
import type {
  Permission,
  PermissionStatus,
} from "@/features/establishment/institution/api/types/permission"
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
}

export interface EmployeeListItem {
  id: number
  documentNumber: string
  name: string
  /**
   * Roles agregados a partir de los permisos del funcionario. Se listan
   * una sola vez por código, conservando el orden en que aparecen en
   * `permissions`. Cuando un funcionario tiene varios permisos con
   * distintos roles, este arreglo contiene todos para renderizarlos
   * como una lista separada por comas.
   */
  roles: CatalogItem[]
  /**
   * Jornadas agregadas desde los permisos, igual que `roles`: un funcionario
   * puede tener permisos en más de una jornada (mañana y tarde, por ejemplo),
   * así que la celda las lista separadas por comas. Vacío mientras no tenga
   * permisos asignados.
   */
  workSchedules: CatalogItem[]
  /**
   * Estados agregados desde los permisos del funcionario. Análogo a
   * `roles`: se preserva el orden de aparición, sin duplicados.
   */
  statuses: PermissionStatus[]
}

export interface EmployeesQueryFilters {
  search?: string
  roles?: string[]
  workSchedules?: string[]
  statuses?: EmployeeStatus[]
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
