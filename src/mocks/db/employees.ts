import { faker } from "@faker-js/faker"

import type { CatalogItem } from "@/types/catalog"
import type {
  Employee,
  EmployeeListItem,
} from "@/features/establishment/employees/api/types/employee"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { DOCUMENT_TYPES } from "@/mocks/db/catalogs/document-types"
import { EDUCATION_LEVELS } from "@/mocks/db/catalogs/education-levels"
import { EMPLOYEE_CLASSES } from "@/mocks/db/catalogs/employee-classes"
import { EMPLOYEE_GRADES } from "@/mocks/db/catalogs/employee-grades"
import { EMPLOYEE_ROLES } from "@/mocks/db/catalogs/employee-roles"
import { EMPLOYMENT_TYPES } from "@/mocks/db/catalogs/employment-types"
import { FUNDING_SOURCES } from "@/mocks/db/catalogs/funding-sources"
import { FUNCTIONAL_POSITIONS } from "@/mocks/db/catalogs/functional-positions"
import { GENDERS } from "@/mocks/db/catalogs/genders"
import { WORK_SCHEDULES } from "@/mocks/db/catalogs/work-schedules"

faker.seed(20260729)

// Autoincremental simulado: la base real asigna el id al crear.
let nextPersonId = 1
let nextEmployeeId = 1

function createCatalogItem(items: CatalogItem[]): CatalogItem {
  return faker.helpers.arrayElement(items)
}

function createPerson(): Person {
  const firstName = faker.person.firstName()
  const middleName = faker.datatype.boolean() ? faker.person.middleName() : undefined
  const lastName = faker.person.lastName()
  const secondLastName = faker.datatype.boolean() ? faker.person.lastName() : undefined

  return {
    id: nextPersonId++,
    documentType: createCatalogItem(DOCUMENT_TYPES),
    identification: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    firstName,
    middleName,
    lastName,
    secondLastName,
    birthDate: faker.date.birthdate({ min: 25, max: 65, mode: "age" }).toISOString(),
    gender: createCatalogItem(GENDERS),
    email: faker.internet.email({ firstName, lastName }),
    phone: faker.phone.number({ style: "international" }),
    password: faker.internet.password({ length: 12 }),
  }
}

function createEmployee(): Employee {
  const permissionCount = faker.number.int({ min: 1, max: 3 })

  return {
    id: nextEmployeeId++,
    person: createPerson(),
    employeeClass: createCatalogItem(EMPLOYEE_CLASSES),
    educationLevel: createCatalogItem(EDUCATION_LEVELS),
    grade: createCatalogItem(EMPLOYEE_GRADES),
    highestEducationLevel: createCatalogItem(EDUCATION_LEVELS),
    fundingSource: createCatalogItem(FUNDING_SOURCES),
    functionalPosition: createCatalogItem(FUNCTIONAL_POSITIONS),
    employmentType: createCatalogItem(EMPLOYMENT_TYPES),
    address: faker.location.streetAddress(),
    permissions: Array.from({ length: permissionCount }, (_, permissionIndex) => ({
      order: permissionIndex + 1,
      role: createCatalogItem(EMPLOYEE_ROLES),
      workSchedule: createCatalogItem(WORK_SCHEDULES),
      status: faker.number.int({ min: 1, max: 100 }) <= 90 ? "ACTIVE" : "SUSPENDED",
    })),
    status: faker.number.int({ min: 1, max: 100 }) <= 85 ? "ACTIVE" : "SUSPENDED",
  }
}

export function createEmployeeRow(employee: Employee & { id: number }): EmployeeListItem {
  /**
   * Roles del funcionario, agregados desde sus permisos y deduplicados por
   * `code` preservando el orden. Si no hay permisos todavía (caso del primer
   * Guardar del flujo de creación), la lista queda vacía y la celda muestra
   * "—", igual que la columna de estado.
   */
  const rolesByCode = new Map<string, CatalogItem>()
  for (const permission of employee.permissions) {
    if (!rolesByCode.has(permission.role.code)) {
      rolesByCode.set(permission.role.code, permission.role)
    }
  }
  const roles: CatalogItem[] = Array.from(rolesByCode.values())

  // Mismo criterio para las jornadas: un funcionario puede tener permisos en
  // varias y la columna las muestra todas, no solo la del primer permiso.
  const workSchedulesByCode = new Map<string, CatalogItem>()
  for (const permission of employee.permissions) {
    if (!workSchedulesByCode.has(permission.workSchedule.code)) {
      workSchedulesByCode.set(permission.workSchedule.code, permission.workSchedule)
    }
  }
  const workSchedules: CatalogItem[] = Array.from(workSchedulesByCode.values())

  /**
   * Estados del funcionario, agregados desde sus permisos y deduplicados
   * preservando el orden de aparición. Si todavía no hay permisos
   * (primer Guardar sin catálogos), la lista queda vacía y la celda
   * muestra "—" como placeholder.
   */
  const statuses = Array.from(new Set(employee.permissions.map((permission) => permission.status)))

  const name = [
    employee.person.firstName,
    employee.person.middleName,
    employee.person.lastName,
    employee.person.secondLastName,
  ]
    .filter(Boolean)
    .join(" ")

  return {
    id: employee.id,
    documentNumber: employee.person.identification,
    name,
    roles,
    workSchedules,
    statuses,
  }
}

const employeeRecords = Array.from({ length: 20 }, () => {
  // `createEmployee` siempre asigna `id` (contador); el cast solo declara
  // esa garantía donde el tipo `Employee` (con `id` opcional para el borrador
  // de alta) no la expresa.
  const employee = createEmployee() as Employee & { id: number }

  return {
    employee,
    row: createEmployeeRow(employee),
  }
})

export const employeesDb: Employee[] = employeeRecords.map((record) => record.employee)

export const employeesRowsDb: EmployeeListItem[] = employeeRecords.map((record) => record.row)

/**
 * `rawEmployee.id` ausente = alta: el backend real lo asignaría al crear,
 * acá lo hace el contador. Con `id` presente es una actualización.
 */
export function upsertEmployeeDetails(rawEmployee: Employee) {
  const employee: Employee & { id: number } = {
    ...rawEmployee,
    id: rawEmployee.id ?? nextEmployeeId++,
  }
  const employeeIndex = employeesDb.findIndex((item) => item.id === employee.id)

  if (employeeIndex >= 0) {
    employeesDb[employeeIndex] = employee
  } else {
    employeesDb.unshift(employee)
  }

  const row = createEmployeeRow(employee)
  const rowIndex = employeesRowsDb.findIndex((item) => item.id === employee.id)

  if (rowIndex >= 0) {
    employeesRowsDb[rowIndex] = row
  } else {
    employeesRowsDb.unshift(row)
  }

  return employee
}

export function deleteEmployeeDetails(id: number) {
  const employeeIndex = employeesDb.findIndex((item) => item.id === id)
  const rowIndex = employeesRowsDb.findIndex((item) => item.id === id)

  if (employeeIndex >= 0) {
    employeesDb.splice(employeeIndex, 1)
  }

  if (rowIndex >= 0) {
    employeesRowsDb.splice(rowIndex, 1)
  }
}

export function deleteManyEmployeeDetails(ids: number[]) {
  const idSet = new Set(ids)

  for (let index = employeesDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(employeesDb[index].id ?? -1)) {
      employeesDb.splice(index, 1)
    }
  }

  for (let index = employeesRowsDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(employeesRowsDb[index].id)) {
      employeesRowsDb.splice(index, 1)
    }
  }
}
