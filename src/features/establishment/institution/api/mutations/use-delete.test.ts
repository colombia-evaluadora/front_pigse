import { afterAll, afterEach, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { establishmentsDb, establishmentsRowsDb } from "@/mocks/db/establishments"
import { establishmentHandlers } from "@/mocks/handlers/establishments"

const server = setupServer(...establishmentHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("removes an establishment through the mock DELETE handler", async () => {
  const existing = establishmentsDb[0]

  expect(existing).toBeDefined()

  const initialDetailsCount = establishmentsDb.length
  const initialRowsCount = establishmentsRowsDb.length

  const response = await fetch(`http://localhost/api/establishments/${existing.id}`, {
    method: "DELETE",
  })

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.status).toBe("ok")
  expect(establishmentsDb).toHaveLength(initialDetailsCount - 1)
  expect(establishmentsRowsDb).toHaveLength(initialRowsCount - 1)
  expect(establishmentsDb.some((item) => item.id === existing.id)).toBe(false)
  expect(establishmentsRowsDb.some((item) => item.id === existing.id)).toBe(false)
})
