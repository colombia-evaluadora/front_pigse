import { afterAll, afterEach, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { establishmentsDb, establishmentsRowsDb } from "@/mocks/db/establishments"
import { establishmentHandlers } from "@/mocks/handlers/establishments"

const server = setupServer(...establishmentHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("removes multiple establishments through the bulk-delete mock handler", async () => {
  const targets = establishmentsDb.slice(0, 3)

  expect(targets.length).toBe(3)

  const initialDetailsCount = establishmentsDb.length
  const initialRowsCount = establishmentsRowsDb.length

  const response = await fetch("http://localhost/api/establishments/bulk-delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(targets.map((item) => item.id)),
  })

  expect(response.status).toBe(200)

  const payload = await response.json()

  expect(payload.status).toBe("ok")
  expect(payload.deletedCount).toBe(3)
  expect(establishmentsDb).toHaveLength(initialDetailsCount - 3)
  expect(establishmentsRowsDb).toHaveLength(initialRowsCount - 3)
  for (const target of targets) {
    expect(establishmentsDb.some((item) => item.id === target.id)).toBe(false)
    expect(establishmentsRowsDb.some((item) => item.id === target.id)).toBe(false)
  }
})

it("rejects bulk-delete when the body is not a list of numbers", async () => {
  const response = await fetch("http://localhost/api/establishments/bulk-delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: "not-a-list" }),
  })

  expect(response.status).toBe(400)

  const payload = await response.json()

  expect(payload.status).toBe("error")
})
