import { api } from "@/lib/api-client"

import type { Person } from "@/features/establishment/employees/api/types/person"

export interface CreateWithPersonResult {
  status: "ok" | "error"
  message: string
  person: Person
}

export function createWithPerson(values: Person): Promise<CreateWithPersonResult> {
  return api.post("/establishments/employees/person", values)
}
