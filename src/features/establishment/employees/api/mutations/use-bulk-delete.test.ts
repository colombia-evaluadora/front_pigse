import { afterAll, afterEach, beforeAll, expect, it } from "vitest"
import { setupServer } from "msw/node"

import { employeesDb, employeesRowsDb } from "@/mocks/db/employees"
import { employeeHandlers } from "@/mocks/handlers/employees"

const server = setupServer(...employeeHandlers)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it("removes multiple employees through the bulk-delete mock handler", async () => {
  const targets = employeesDb.slice(0, 3)

  expect(targets.length).toBe(3)

  const initialDetailsCount = employeesDb.length
  const initialRowsCount = employeesRowsDb.length

  const response = await fetch("http://localhost/api/establishments/employees/bulk-delete", {
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
  expect(employeesDb).toHaveLength(initialDetailsCount - 3)
  expect(employeesRowsDb).toHaveLength(initialRowsCount - 3)
  for (const target of targets) {
    expect(employeesDb.some((item) => item.id === target.id)).toBe(false)
    expect(employeesRowsDb.some((item) => item.id === target.id)).toBe(false)
  }
})

it("rejects bulk-delete when the body is not a list of numbers", async () => {
  const response = await fetch("http://localhost/api/establishments/employees/bulk-delete", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify([123, "not-a-number"]),
  })

  expect(response.status).toBe(400)

  const payload = await response.json()

  expect(payload.status).toBe("error")
})
