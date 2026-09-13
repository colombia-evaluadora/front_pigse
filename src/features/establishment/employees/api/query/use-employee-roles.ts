import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { CATALOGS } from "@/lib/catalogs"
import { unwrapRows } from "@/lib/response-envelope"

import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/types/catalog"

interface RealEmployeeRoleRow {
  pk_rol: number
  codigo: string
  nombre: string
}

async function fetchEmployeeRoles(): Promise<CatalogItem[]> {
  // TROL no es TLISTA_VALOR: no lo cubre el catálogo genérico
  // `/select/:categoria` (ver use-catalogs.ts) — tiene su propia tabla,
  // igual que TMUNICIPIO/TPROPIEDAD_JURIDICA/TDISCAPACIDAD (ver V58 en el
  // SSO). Solo trae PK_TROL >= 9: los roles 1..8 son "de sistema"
  // (super-admin de establecimiento, jefe de sistema, etc.), no roles que
  // se le asignen a un funcionario normal desde este select.
  if (env.ENABLE_API_MOCKING) {
    return getCatalog<CatalogItem>(CATALOGS.EMPLOYEE_ROLES)
  }
  // `api` (no `fetch` crudo): agrega el `Authorization: Bearer <token>` que
  // el gateway real exige — sin eso responde 403 antes de llegar a la query.
  const response = (await api.get("/pigse/catalogos/roles")) as unknown as
    | { rows: RealEmployeeRoleRow[] }
    | RealEmployeeRoleRow[]
  const rows = unwrapRows<RealEmployeeRoleRow>(response)
  return rows.map((row) => ({
    id: row.pk_rol,
    code: row.codigo,
    name: row.nombre,
  }))
}

export function useEmployeeRolesQuery() {
  return useQuery({
    queryKey: ["catalogs", "employee-roles"],
    queryFn: fetchEmployeeRoles,
  })
}
