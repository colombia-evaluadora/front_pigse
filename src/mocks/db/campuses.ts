import { faker } from "@faker-js/faker"

import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { ZONES } from "@/mocks/db/catalogs/establishment"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"

faker.seed(20260728)

const CAMPUS_BASE_NAMES = [
  "I.E. JORGE GARCÍA USTA LA SALLE BICENTENARIO",
  "I.E. NUESTRA SEÑORA DE FÁTIMA",
  "I.E. CLEMENTE MANUEL ZABALA",
  "I.E. SAN JOSÉ",
  "I.E. LA ESPERANZA",
  "I.E. NUEVO HORIZONTE",
  "I.E. TÉCNICA INDUSTRIAL",
  "I.E. JOSÉ CELESTINO MUTIS",
  "I.E. SIMÓN BOLÍVAR",
  "I.E. FRANCISCO DE PAULA SANTANDER",
  "I.E. NUESTRA SEÑORA DEL CARMEN",
  "I.E. MARÍA AUXILIADORA",
  "I.E. EL BOSQUE",
  "I.E. LOS ALPES",
  "I.E. SAN FRANCISCO",
  "I.E. LA INMACULADA",
  "I.E. SANTA TERESITA",
  "I.E. CIUDADELA EDUCATIVA",
  "I.E. TÉCNICO COMERCIAL",
  "I.E. VILLA ESTADIO",
]

const CAMPUS_SUFFIXES = [
  "SEDE PRINCIPAL",
  "SEDE NORTE",
  "SEDE SUR",
  "SEDE ORIENTE",
  "SEDE OCCIDENTE",
  "SEDE RURAL",
]

const NEIGHBORHOODS = [
  "Centro",
  "El Prado",
  "La Castellana",
  "Boston",
  "La Victoria",
  "Las Delicias",
  "El Recreo",
  "Los Alpes",
  "San José",
  "Alto Prado",
  "La Esperanza",
  "Ciudadela 2000",
]

const COMMUNES = [
  "Comuna 1",
  "Comuna 2",
  "Comuna 3",
  "Comuna 4",
  "Comuna 5",
  "Comuna 6",
  "Comuna 7",
  "Comuna 8",
]

function createCatalogItem(items: CatalogItem[]): CatalogItem {
  return faker.helpers.arrayElement(items)
}

function generateDane(index: number): string {
  return String(30000000 + index).padStart(8, "0")
}

function createCampus(index: number): Campus {
  const baseName = faker.helpers.arrayElement(CAMPUS_BASE_NAMES)
  const suffix = faker.helpers.arrayElement(CAMPUS_SUFFIXES)
  const zone = createCatalogItem(ZONES)

  return {
    id: index,
    name: `${baseName} ${suffix}`,
    dane: generateDane(index),
    zone,
    neighborhood: faker.helpers.arrayElement(NEIGHBORHOODS),
    commune: faker.helpers.arrayElement(COMMUNES),
    address: faker.location.streetAddress(),
    phone: faker.phone.number({ style: "international" }),
  }
}

export const campusesDb: Campus[] = Array.from({ length: 9 }, (_, index) =>
  createCampus(index + 1)
)

export const campusesRowsDb: Campus[] = [...campusesDb]

// Autoincremental simulado, continúa después de los 9 sembrados arriba. Lo
// consume el handler de `POST /establishments/campuses`, que es quien decide
// el id de una sede nueva — acá solo se persiste el `Campus` ya completo.
let nextCampusId = campusesDb.length + 1

export function takeNextCampusId(): number {
  return nextCampusId++
}

export function upsertCampusDetails(campus: Campus) {
  const detailsIndex = campusesDb.findIndex((item) => item.id === campus.id)
  const rowIndex = campusesRowsDb.findIndex((item) => item.id === campus.id)

  if (detailsIndex >= 0) {
    campusesDb[detailsIndex] = campus
  } else {
    campusesDb.unshift(campus)
  }

  if (rowIndex >= 0) {
    campusesRowsDb[rowIndex] = campus
  } else {
    campusesRowsDb.unshift(campus)
  }

  return campus
}

export function deleteCampusDetails(id: number) {
  const detailsIndex = campusesDb.findIndex((item) => item.id === id)
  const rowIndex = campusesRowsDb.findIndex((item) => item.id === id)

  if (detailsIndex >= 0) {
    campusesDb.splice(detailsIndex, 1)
  }

  if (rowIndex >= 0) {
    campusesRowsDb.splice(rowIndex, 1)
  }
}

export function deleteManyCampusDetails(ids: number[]) {
  const idSet = new Set(ids)

  for (let index = campusesDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(campusesDb[index].id)) {
      campusesDb.splice(index, 1)
    }
  }

  for (let index = campusesRowsDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(campusesRowsDb[index].id)) {
      campusesRowsDb.splice(index, 1)
    }
  }
}