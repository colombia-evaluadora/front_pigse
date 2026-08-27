import { useQuery } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"
import { toNavItemDtos } from "@/features/navigation/api/menu-mapper"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import type { NavItem } from "@/features/navigation/api/types/nav-item"

import type { MenuNode } from "@/features/administration/roles-menus/api/types/role-menu"

/**
 * El sidebar sale de `GET /pigse/my-menus` (`id_query = 200`), que cruza
 * `role_route -> route -> app_route -> app` filtrando por
 * `a.name = 'PIGSE'` y por los roles del token
 * (`:CONTEXT.ROLES_ARRAY::text[]`). Es "los menús que me tocan a mí en
 * ESTA app", ya filtrado por el backend.
 *
 * NO usa `/menus`: esa devuelve el catálogo COMPLETO sin filtrar por rol y
 * es la fuente del panel "Menús disponibles" de la pantalla de
 * configuración, no del sidebar.
 */

/**
 * El backend guarda los paths SIN el prefijo del layout (`/gestion-documental`),
 * porque `public.route.path` es agnóstico de cómo el SPA monta sus rutas. El
 * router de TanStack las tiene colgadas de `/app`, así que hay que
 * anteponerlo o los `<Link>` del sidebar apuntarían a rutas inexistentes.
 *
 * Es idempotente: si algún día el backend empieza a guardar el path completo,
 * o si el dato viene del mock (que ya usa `/app/...`), no se duplica.
 */
function toAppPath(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith("/app/") || path === "/app") return path
  return `/app${path.startsWith("/") ? "" : "/"}${path}`
}

async function fetchNavItemsDto() {
  const menus = await pigse.getRows<MenuNode>("/my-menus")
  return toNavItemDtos(menus.map((menu) => ({ ...menu, path: toAppPath(menu.path) })))
}

async function fetchNavItems(): Promise<NavItem[]> {
  const items = await fetchNavItemsDto()
  return items.map((item) => ({
    ...item,
    icon: getNavIcon(item.icon),
  }))
}

export function useNavItemsQuery() {
  return useQuery({
    queryKey: ["navigation", "menu"],
    queryFn: fetchNavItems,
    staleTime: Infinity,
  })
}
