import { authHandlers } from "@/mocks/handlers/auth"
import { establishmentHandlers } from "@/mocks/handlers/establishments"
import { employeeHandlers } from "@/mocks/handlers/employees"
import { catalogHandlers } from "@/mocks/handlers/catalog"
import { rolesHandlers } from "@/mocks/handlers/roles"
import { plansHandlers } from "@/mocks/handlers/plans"
import { reportesHandlers } from "@/mocks/handlers/reportes"
import { documentHandlers } from "@/mocks/handlers/documents"
import { complianceHandlers } from "@/mocks/handlers/compliance"

export const handlers = [
  ...authHandlers,
  ...reportesHandlers,
  ...establishmentHandlers,
  ...employeeHandlers,
  ...catalogHandlers,
  ...rolesHandlers,
  ...plansHandlers,
  ...documentHandlers,
  ...complianceHandlers,
]
