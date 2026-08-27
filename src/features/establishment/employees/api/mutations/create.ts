import { api } from "@/lib/api-client"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

export interface CreateResult {
  status: "ok" | "error"
  message: string
  employee: Employee
}

export function create(values: Employee): Promise<CreateResult> {
  return api.post("/establishments/employees", values)
}
