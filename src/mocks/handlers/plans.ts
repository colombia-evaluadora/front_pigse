import { http, HttpResponse, delay } from "msw"

import type { Plan } from "@/features/administration/roles-menus/api/types/role-menu"

import { plansDb } from "@/mocks/db/plans"

/** Mismo sobre `{rows, outParams}` que devuelve el gateway. */
function rows(data: Plan[], init?: ResponseInit) {
  return HttpResponse.json({ rows: data, outParams: {} }, init)
}

export const plansHandlers = [
  http.get("/api/pigse/plans", async () => {
    await delay(150)
    return rows(plansDb)
  }),

  http.post("/api/pigse/plans", async ({ request }) => {
    await delay(200)
    const { name } = (await request.json()) as { name: string }
    const trimmed = name.trim()

    if (!trimmed) {
      return HttpResponse.json({ message: "El nombre del plan es obligatorio." }, { status: 400 })
    }
    if (plansDb.some((plan) => plan.name.toLowerCase() === trimmed.toLowerCase())) {
      return HttpResponse.json({ message: "Ya existe un plan con ese nombre." }, { status: 409 })
    }

    const plan: Plan = { id: Math.max(0, ...plansDb.map((it) => it.id)) + 1, name: trimmed }
    plansDb.push(plan)
    return rows([plan], { status: 201 })
  }),
]
