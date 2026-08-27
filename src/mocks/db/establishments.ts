import { faker } from "@faker-js/faker"

import type {
  Establishment,
  EstablishmentDetails,
  EstablishmentStatus,
} from "@/features/establishment/institution/api/types/establishment"
import type { CatalogItem } from "@/types/catalog"
import type { Municipality } from "@/features/establishment/institution/api/types/location"
import type { Person } from "@/features/establishment/employees/api/types/person"
import {
  CALENDARS,
  COST_REGIMEN,
  DISABILITIES,
  IDIOMAS,
  LEGAL_TYPES,
  LICENSE_STATUSES,
  RANGO_TARIFAS,
  ZONES,
} from "@/mocks/db/catalogs/establishment"
import { DOCUMENT_TYPES } from "@/mocks/db/catalogs/document-types"
import { GENDERS } from "@/mocks/db/catalogs/genders"
import { POPULATION_GENDERS } from "@/mocks/db/catalogs/population-genders"
import { MUNICIPALITIES } from "@/mocks/db/catalogs/municipalities"

faker.seed(20260722)

// Autoincremental simulado: la base real asigna el id al crear.
let nextPersonId = 1
let nextEstablishmentId = 1

const ESTABLISHMENT_NAMES = [
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

const DISTRICTS = [
  { code: "01", name: "Distrito 1" },
  { code: "02", name: "Distrito 2" },
  { code: "03", name: "Distrito 3" },
]

const COMMUNES = [
  { code: "01", name: "Comuna 1" },
  { code: "02", name: "Comuna 2" },
  { code: "03", name: "Comuna 3" },
]

const LOCALITIES = [
  { code: "01", name: "Localidad 1" },
  { code: "02", name: "Localidad 2" },
  { code: "03", name: "Localidad 3" },
]

function generateDane(): string {
  return faker.string.numeric({ length: 8, allowLeadingZeros: false })
}

function generateNit(): string {
  return faker.string.numeric({ length: 9, allowLeadingZeros: false })
}

/**
 * El `id` del catálogo real se conserva tal cual: los `<Select>` del formulario
 * resuelven la etiqueta buscando ese id entre las opciones de `/api/catalogs/*`,
 * así que inventar un uuid acá hacía que al editar se viera el id crudo en vez
 * del nombre. Solo las listas ad-hoc (sin `id` propio) reciben uno generado.
 */
function createCatalogItem(items: Array<{ id?: number; code: string; name: string }>): CatalogItem {
  const item = faker.helpers.arrayElement(items)

  return {
    id: item.id ?? faker.number.int({ min: 1000, max: 999999 }),
    code: item.code,
    name: item.name,
  }
}

function createMunicipality(): Municipality {
  const municipality = faker.helpers.arrayElement(MUNICIPALITIES)

  return {
    id: municipality.id,
    code: String(municipality.id),
    name: municipality.name,
    department: {
      id: municipality.department.id,
      code: String(municipality.department.id),
      name: municipality.department.name,
    },
  }
}

function createPerson(): Person {
  return {
    id: nextPersonId++,
    documentType: createCatalogItem(DOCUMENT_TYPES),
    identification: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    birthDate: faker.date.birthdate({ min: 25, max: 70, mode: "age" }).toISOString(),
    gender: createCatalogItem(GENDERS),
    email: faker.internet.email(),
    phone: faker.phone.number({ style: "international" }),
    password: faker.internet.password({ length: 12 }),
  }
}

function createEstablishmentDetails(): EstablishmentDetails {
  const name = faker.helpers.arrayElement(ESTABLISHMENT_NAMES)
  const municipality = createMunicipality()

  return {
    id: nextEstablishmentId++,
    basicInfo: {
      name,
      dane: generateDane(),
      nit: generateNit(),
      ownershipType: createCatalogItem(LEGAL_TYPES),
    },
    address: {
      municipality,
      zone: createCatalogItem(ZONES),
      district: createCatalogItem(DISTRICTS),
      commune: createCatalogItem(COMMUNES),
      locality: createCatalogItem(LOCALITIES),
      address: faker.location.streetAddress(),
    },
    contact: {
      email: faker.internet.email({ firstName: name.replace(/\s+/g, "").toLowerCase() }),
      website: faker.internet.url(),
      phone: faker.phone.number({ style: "international" }),
      fax: faker.phone.number({ style: "international" }),
    },
    additionalInfo: {
      approvalResolution: `RES-${faker.string.numeric({ length: 4, allowLeadingZeros: true })}`,
      teachingLanguage: createCatalogItem(IDIOMAS),
      calendar: createCatalogItem(CALENDARS),
      costRegime: createCatalogItem(COST_REGIMEN),
      populationGender: createCatalogItem(POPULATION_GENDERS),
      tuitionRange: createCatalogItem(RANGO_TARIFAS),
      disabilityType: createCatalogItem(DISABILITIES),
      operatingLicense: faker.datatype.boolean(),
      // Texto libre (LICENCIA_FUNCIONAMIENTO es VARCHAR en la base real), no
      // un catálogo — se rellena con un nombre de LICENSE_STATUSES solo para
      // que el dato de prueba luzca realista.
      licenseStatus: faker.helpers.arrayElement(LICENSE_STATUSES).name,
      licenseDate: faker.datatype.boolean() ? faker.date.recent({ days: 365 }).toISOString() : null,
      ethnicAttention: faker.datatype.boolean(),
      giftedAttention: faker.datatype.boolean(),
      subsidy: faker.datatype.boolean(),
    },
    principal: createPerson(),
    secretary: createPerson(),
  }
}

export function createEstablishmentRow(details: EstablishmentDetails): Establishment {
  // `status`/`statusLabel` reflejan el mismo par que arma el real
  // (`fk_estado` como texto + `estado_nombre`) — acá contra el fixture
  // ENTITY_STATUSES (1=Activo, 2=Suspendido), no un enum propio.
  const isActive = faker.number.int({ min: 1, max: 100 }) <= 85
  const status: EstablishmentStatus = isActive ? "1" : "2"
  const statusLabel = isActive ? "Activo" : "Suspendido"

  return {
    // `details.id` siempre está poblado acá: lo asigna `upsertEstablishmentDetails`
    // antes de llamar a esta función, y los registros semilla ya lo traen.
    id: details.id ?? nextEstablishmentId++,
    dane: details.basicInfo.dane,
    name: details.basicInfo.name,
    department: details.address.municipality?.department.name ?? "",
    municipality: details.address.municipality?.name ?? "",
    status,
    statusLabel,
  }
}

const establishmentRecords = Array.from({ length: 3 }, () => {
  const details = createEstablishmentDetails()

  return {
    details,
    row: createEstablishmentRow(details),
  }
})

export const establishmentsDb: EstablishmentDetails[] = establishmentRecords.map(
  (record) => record.details,
)

export const establishmentsRowsDb: Establishment[] = establishmentRecords.map(
  (record) => record.row,
)

/**
 * `details.id` ausente = alta: el backend real lo asignaría al crear, acá lo
 * hace el contador. Con `id` presente es una actualización.
 */
export function upsertEstablishmentDetails(rawDetails: EstablishmentDetails) {
  const details: EstablishmentDetails = {
    ...rawDetails,
    id: rawDetails.id ?? nextEstablishmentId++,
  }
  const existingIndex = establishmentsDb.findIndex((item) => item.id === details.id)

  if (existingIndex >= 0) {
    establishmentsDb[existingIndex] = details
  } else {
    establishmentsDb.unshift(details)
  }

  const row = createEstablishmentRow(details)
  const rowIndex = establishmentsRowsDb.findIndex((item) => item.id === details.id)

  if (rowIndex >= 0) {
    establishmentsRowsDb[rowIndex] = row
  } else {
    establishmentsRowsDb.unshift(row)
  }

  return { details, row }
}

export function deleteEstablishmentDetails(id: number) {
  const existingIndex = establishmentsDb.findIndex((item) => item.id === id)
  const rowIndex = establishmentsRowsDb.findIndex((item) => item.id === id)

  if (existingIndex >= 0) {
    establishmentsDb.splice(existingIndex, 1)
  }

  if (rowIndex >= 0) {
    establishmentsRowsDb.splice(rowIndex, 1)
  }
}

export function deleteManyEstablishmentDetails(ids: number[]) {
  const idSet = new Set(ids)

  for (let index = establishmentsDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(establishmentsDb[index].id ?? -1)) {
      establishmentsDb.splice(index, 1)
    }
  }

  for (let index = establishmentsRowsDb.length - 1; index >= 0; index -= 1) {
    if (idSet.has(establishmentsRowsDb[index].id)) {
      establishmentsRowsDb.splice(index, 1)
    }
  }
}
