import { afterAll, afterEach, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { establishmentsDb, establishmentsRowsDb } from "@/mocks/db/establishments"
import { establishmentHandlers } from "@/mocks/handlers/establishments"

const server = setupServer(...establishmentHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("persists a new establishment through the mock POST handler", async () => {
  const initialCount = establishmentsDb.length

  const response = await fetch("http://localhost/api/establishments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Sin `id`: lo asigna el backend (mock) al crear.
    body: JSON.stringify({
      basicInfo: {
        name: "I.E. Prueba",
        dane: "12345678",
        nit: "900123456",
        ownershipType: {
          id: 9,
          code: "OFFICIAL",
          name: "Oficial",
        },
      },
      address: {
        municipality: {
          id: 11001,
          code: "11001",
          name: "Bogotá",
          department: {
            id: 11,
            code: "11",
            name: "Bogotá",
          },
        },
        zone: {
          id: 11,
          code: "URBANA",
          name: "Urbana",
        },
        district: { id: 0, code: "01", name: "Distrito 1" },
        commune: { id: 0, code: "01", name: "Comuna 1" },
        locality: { id: 0, code: "01", name: "Localidad 1" },
        address: "Calle 123",
      },
      contact: {
        email: "test@example.com",
        website: "https://example.com",
        phone: "3000000000",
        fax: "3000000001",
      },
      additionalInfo: {
        approvalResolution: "RES-001",
        teachingLanguage: {
          id: 5,
          code: "ES",
          name: "Español",
        },
        calendar: {
          id: 1,
          code: "A",
          name: "Calendario A",
        },
        costRegime: {
          id: 13,
          code: "LIBERTAD_VIGILADA",
          name: "Libertad Vigilada",
        },
        populationGender: {
          id: 1,
          code: "MASCULINO",
          name: "Masculino",
        },
        tuitionRange: {
          id: 3,
          code: "<0.6",
          name: "Menor de 0.6 SMLV",
        },
        disabilityType: {
          id: 15,
          code: "NA",
          name: "No aplica",
        },
        operatingLicense: true,
        licenseDate: null,
        ethnicAttention: false,
        giftedAttention: false,
        subsidy: false,
      },
      principal: null,
      secretary: null,
    }),
  })

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.status).toBe("ok")
  expect(establishmentsDb).toHaveLength(initialCount + 1)
  expect(establishmentsRowsDb.some((row) => row.id === payload.establishment.id)).toBe(true)
})

it("loads an existing establishment from the mock store when editing", async () => {
  const existing = establishmentsDb[0]

  expect(existing).toBeDefined()

  const response = await fetch(`http://localhost/api/establishments/${existing.id}`)

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.establishment.id).toBe(existing.id)
  expect(payload.establishment.basicInfo.name).toBe(existing.basicInfo.name)
})

it("updates an existing establishment through the mock PUT handler", async () => {
  const existing = establishmentsDb[0]

  expect(existing).toBeDefined()

  const nextName = `${existing.basicInfo.name} EDITADO`

  const response = await fetch(`http://localhost/api/establishments/${existing.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...existing,
      basicInfo: {
        ...existing.basicInfo,
        name: nextName,
      },
    }),
  })

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.status).toBe("ok")
  expect(payload.message).toBe("Establecimiento actualizado.")
  expect(establishmentsDb.find((item) => item.id === existing.id)?.basicInfo.name).toBe(nextName)
})
