import { afterAll, afterEach, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { campusesDb, campusesRowsDb } from "@/mocks/db/campuses"
import { campusHandlers } from "@/mocks/handlers/campuses"

const server = setupServer(...campusHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("removes a campus through the mock DELETE handler", async () => {
  const existing = campusesDb[0]

  expect(existing).toBeDefined()

  const initialDetailsCount = campusesDb.length
  const initialRowsCount = campusesRowsDb.length

  const response = await fetch(`http://localhost/api/establishments/campuses/${existing.id}`, {
    method: "DELETE",
  })

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.status).toBe("ok")
  expect(campusesDb).toHaveLength(initialDetailsCount - 1)
  expect(campusesRowsDb).toHaveLength(initialRowsCount - 1)
  expect(campusesDb.some((item) => item.id === existing.id)).toBe(false)
  expect(campusesRowsDb.some((item) => item.id === existing.id)).toBe(false)
})