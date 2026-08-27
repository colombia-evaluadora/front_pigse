import { faker } from "@faker-js/faker"

import type { Person } from "@/features/establishment/employees/api/types/person"
import { DOCUMENT_TYPES } from "@/mocks/db/catalogs/document-types"
import { GENDERS } from "@/mocks/db/catalogs/genders"

faker.seed(20260730)

function createCatalogItem<T extends { id: number }>(items: T[]): T {
  return faker.helpers.arrayElement(items)
}

// Autoincremental simulado: la base real asigna el id al crear, así que acá
// alcanza con un contador que nunca se reutiliza, ni cuando se borra un
// registro.
let nextPersonId = 1

function createPersonRecord(): Person {
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

const seededPersons = Array.from({ length: 240 }, createPersonRecord)

export const personsDb: Person[] = seededPersons

export function findPersonById(id: number): Person | undefined {
  return personsDb.find((person) => person.id === id)
}

/**
 * `person.id` ausente = alta: el backend real lo asignaría al crear, acá lo
 * hace el contador. Con `id` presente es una actualización.
 */
export function upsertPerson(person: Person): Person {
  const normalized: Person = {
    ...person,
    id: person.id ?? nextPersonId++,
  }

  const index = personsDb.findIndex((item) => item.id === normalized.id)

  if (index >= 0) {
    personsDb[index] = normalized
  } else {
    personsDb.unshift(normalized)
  }

  return normalized
}

export function deletePerson(id: number): void {
  const index = personsDb.findIndex((item) => item.id === id)

  if (index >= 0) {
    personsDb.splice(index, 1)
  }
}

export function deleteManyPersons(ids: number[]): void {
  const uniqueIds = new Set(ids)

  for (let index = personsDb.length - 1; index >= 0; index -= 1) {
    if (uniqueIds.has(personsDb[index].id ?? -1)) {
      personsDb.splice(index, 1)
    }
  }
}
