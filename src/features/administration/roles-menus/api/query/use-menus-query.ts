import { useQuery } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"

import type { MenuNode } from "@/features/administration/roles-menus/api/types/role-menu"

/** Catálogo completo de menús, sin filtrar por rol. */
function fetchMenus(): Promise<MenuNode[]> {
  return pigse.getRows<MenuNode>("/menus")
}

export const menusQueryKey = () => ["menus"]

export function useMenusQuery() {
  return useQuery({
    queryKey: menusQueryKey(),
    queryFn: fetchMenus,
    staleTime: Infinity,
  })
}
