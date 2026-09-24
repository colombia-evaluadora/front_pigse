import { authHandlers } from "@/mocks/handlers/auth"
import { establishmentHandlers } from "@/mocks/handlers/establishments"
import { campusHandlers } from "@/mocks/handlers/campuses"
import { employeeHandlers } from "@/mocks/handlers/employees"
import { catalogHandlers } from "@/mocks/handlers/catalog"
import { rolesHandlers } from "@/mocks/handlers/roles"
import { plansHandlers } from "@/mocks/handlers/plans"
import { reportesHandlers } from "@/mocks/handlers/reportes"
import { documentHandlers } from "@/mocks/handlers/documents"
import { complianceHandlers } from "@/mocks/handlers/compliance"
import { userActivityHandlers } from "@/mocks/handlers/user-activity"

export const handlers = [
  ...authHandlers,
  ...reportesHandlers,
  ...establishmentHandlers,
  ...campusHandlers,
  ...employeeHandlers,
  ...catalogHandlers,
  ...rolesHandlers,
  ...plansHandlers,
  ...documentHandlers,
  ...complianceHandlers,
  ...userActivityHandlers,
]
