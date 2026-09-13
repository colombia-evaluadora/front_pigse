import { afterAll, afterEach, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { campusesDb, campusesRowsDb } from "@/mocks/db/campuses"
import { campusHandlers } from "@/mocks/handlers/campuses"

const server = setupServer(...campusHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("persists a new campus through the mock POST handler", async () => {
  const initialCount = campusesDb.length

  const response = await fetch("http://localhost/api/establishments/campuses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    // Sin `id`: lo asigna el backend (mock) al crear.
    body: JSON.stringify({
      name: "I.E. San Francisco de Asís Sede Principal",
      dane: "27921853",
      zone: {
        id: 11,
        code: "URBANA",
        name: "Urbana",
      },
      neighborhood: "Villa Tita",
      commune: "20",
      address: "Calle 56 No. 16 - 18",
      phone: "6042690520",
    }),
  })

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.status).toBe("ok")
  expect(campusesDb).toHaveLength(initialCount + 1)
  expect(campusesRowsDb.some((row) => row.id === payload.campus.id)).toBe(true)
})

it("loads an existing campus from the mock store", async () => {
  const existing = campusesDb[0]

  expect(existing).toBeDefined()

  const response = await fetch(`http://localhost/api/establishments/campuses/${existing.id}`)

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.campus.id).toBe(existing.id)
  expect(payload.campus.name).toBe(existing.name)
})

it("updates an existing campus through the mock PUT handler", async () => {
  const existing = campusesDb[0]

  expect(existing).toBeDefined()

  const nextName = `${existing.name} EDITADA`

  const response = await fetch(`http://localhost/api/establishments/campuses/${existing.id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...existing,
      name: nextName,
    }),
  })

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.status).toBe("ok")
  expect(payload.message).toBe("Sede actualizada.")
  expect(campusesDb.find((item) => item.id === existing.id)?.name).toBe(nextName)
})