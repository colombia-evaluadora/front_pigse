import { useQuery } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"

export interface RoleMenuAssignment {
  id: number
  soloLectura: boolean
}

/**
 * Menús asignados al rol con su marca "Solo lectura" (`role_route.puede_*`:
 * solo lectura = puede ver pero no crear/editar/eliminar). Se aceptan también
 * filas de un solo número por compatibilidad con la respuesta vieja.
 */
async function fetchRoleMenus(roleId: number): Promise<RoleMenuAssignment[]> {
  const rows = await pigse.getRows<{ id: number; soloLectura?: boolean } | number>(
    `/roles/${roleId}/menus`,
  )
  return rows.map((row) =>
    typeof row === "number" ? { id: row, soloLectura: false } : { id: row.id, soloLectura: row.soloLectura ?? false },
  )
}

export const roleMenusQueryKey = (roleId: number | null) => ["role-menus", roleId]

export function useRoleMenusQuery(roleId: number | null) {
  return useQuery({
    queryKey: roleMenusQueryKey(roleId),
    queryFn: () => fetchRoleMenus(roleId as number),
    enabled: roleId != null,
  })
}
