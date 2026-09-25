import { queryOptions, useQuery } from "@tanstack/react-query"

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

export const navItemsQueryOptions = queryOptions({
  queryKey: ["navigation", "menu"],
  queryFn: fetchNavItems,
  staleTime: Infinity,
})

export function useNavItemsQuery() {
  return useQuery(navItemsQueryOptions)
}

/**
 * Primera pantalla a la que puede entrar el usuario: la del primer item del
 * sidebar, en el mismo orden en que se pinta. Sirve para resolver `/app`
 * (`appIndexRoute`) SIN depender de `findFirstAllowedPath` (`lib/
 * auth-routes.ts`), que solo conoce PREFIJOS de acceso — algunos (como
 * "/administracion") son el path de un GRUPO sin ruta propia, no de una
 * pantalla real, y mandar ahí de una devolvía "Página no encontrada" en
 * cada login para cualquier Administrador (reportado en vivo). Los grupos
 * ya heredan la ruta de su primer hijo en `toNavItemDtos`, así que el `url`
 * del primer item siempre es navegable. `null` si el menú vino vacío.
 * Mismo criterio que `getFirstNavUrl` en front_colombia_evaluadora.
 */
export function getFirstNavUrl(items: NavItem[]): string | null {
  return items[0]?.url ?? null
}
