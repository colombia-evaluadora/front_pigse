import { useQuery } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"

import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"

function fetchRoles(): Promise<Role[]> {
  return pigse.getRows<Role>("/roles")
}

export const rolesQueryKey = () => ["roles"]

export function useRolesQuery() {
  return useQuery({
    queryKey: rolesQueryKey(),
    queryFn: fetchRoles,
    staleTime: Infinity,
  })
}
