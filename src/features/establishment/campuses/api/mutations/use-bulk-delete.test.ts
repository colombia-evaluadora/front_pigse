import { afterAll, afterEach, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { campusesDb, campusesRowsDb } from "@/mocks/db/campuses"
import { campusHandlers } from "@/mocks/handlers/campuses"

const server = setupServer(...campusHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("removes multiple campuses through the bulk-delete mock handler", async () => {
  const targets = campusesDb.slice(0, 3)

  expect(targets.length).toBe(3)

  const initialDetailsCount = campusesDb.length
  const initialRowsCount = campusesRowsDb.length

  const response = await fetch("http://localhost/api/establishments/campuses/bulk-delete", {
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
  expect(campusesDb).toHaveLength(initialDetailsCount - 3)
  expect(campusesRowsDb).toHaveLength(initialRowsCount - 3)
  for (const target of targets) {
    expect(campusesDb.some((item) => item.id === target.id)).toBe(false)
    expect(campusesRowsDb.some((item) => item.id === target.id)).toBe(false)
  }
})

it("rejects bulk-delete when the body is not a list of numbers", async () => {
  const response = await fetch("http://localhost/api/establishments/campuses/bulk-delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify("not-a-list"),
  })

  expect(response.status).toBe(400)

  const payload = await response.json()

  expect(payload.status).toBe("error")
})