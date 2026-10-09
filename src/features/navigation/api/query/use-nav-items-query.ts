import { queryOptions, useQuery, type QueryClient } from "@tanstack/react-query"

import { isForbiddenError } from "@/lib/api-client"
import { pigse } from "@/lib/pigse-client"
import { toNavItemDtos } from "@/features/navigation/api/menu-mapper"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import type { NavItem } from "@/features/navigation/api/types/nav-item"
import { canAccessPath } from "@/features/navigation/lib/route-access"

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

/**
 * Un 403 de `/my-menus` es un menú VACÍO, no un error: la sesión es válida
 * (el interceptor de `api-client` ya la revalidó contra `/auth/refresh`; si
 * no, estaría redirigiendo al login) pero ningún rol del usuario está
 * habilitado en PIGSE — los usuarios del SSO sin rol PIGSE. Resolverlo acá
 * (y no en cada llamador) deja el `[]` en el cache: el sidebar no queda en
 * "error + Reintentar" para siempre, el guard de rutas lo niega todo sin
 * volver a pedirlo en cada navegación y la pantalla "Sin acceso" no dispara
 * otro 403 al montar.
 */
async function fetchMyMenus(): Promise<MenuNode[]> {
  try {
    return await pigse.getRows<MenuNode>("/my-menus")
  } catch (error) {
    if (isForbiddenError(error)) return []
    throw error
  }
}

async function fetchNavItemsDto() {
  const menus = await fetchMyMenus()
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
 * El menú del usuario para DECIDIR acceso (guard de rutas y redirect de
 * `/app` en `router.tsx`), sobre la misma entrada de cache que el sidebar.
 *
 * - Sin `maxAgeMs` (default): `fetchQuery` respeta el `staleTime: Infinity`
 *   de `navItemsQueryOptions`, así que reusa el cache y solo vuelve a pedir
 *   si no hay dato o si alguien lo invalidó (las mutaciones de "Roles y
 *   menús" invalidan `["navigation", "menu"]`; el logout y la sesión vencida
 *   hacen `queryClient.clear()`).
 * - `maxAgeMs`: vuelve a pedir si el dato del cache es más viejo que eso
 *   (`0` = siempre). Para las decisiones que no pueden apoyarse en un menú
 *   viejo — ver #58 —; como lo escribe en la misma entrada del cache, el
 *   sidebar se actualiza solo.
 *
 * Errores (el 403 ya llega como menú vacío, ver `fetchMyMenus`):
 *
 * - Con un menú ya en cache (red caída, 5xx al refrescar) → ese menú: es el
 *   del usuario de hace un rato, mejor que bloquearle la app por un refresco
 *   que falló.
 * - Sin nada en cache → se propaga: sin menú no se puede decidir, y eso NO
 *   es lo mismo que "sin acceso"; el llamador muestra el error con
 *   "Reintentar" (`MenuErrorPage`).
 */
export async function fetchNavItemsForAccess(
  queryClient: QueryClient,
  { maxAgeMs }: { maxAgeMs?: number } = {},
): Promise<NavItem[]> {
  try {
    return await queryClient.fetchQuery(
      maxAgeMs === undefined
        ? navItemsQueryOptions
        : { ...navItemsQueryOptions, staleTime: maxAgeMs },
    )
  } catch (error) {
    const cached = queryClient.getQueryData(navItemsQueryOptions.queryKey)
    if (cached) return cached
    throw error
  }
}

/**
 * Primera pantalla a la que puede entrar el usuario: la del primer item del
 * sidebar, en el mismo orden en que se pinta. Resuelve `/app`
 * (`appIndexRoute`) y el botón "Ir al inicio" de la pantalla "Sin acceso".
 * Los grupos ya heredan la ruta de su primer hijo en `toNavItemDtos`, así
 * que el `url` del primer item es navegable. Mismo criterio que
 * `getFirstNavUrl` en front_colombia_evaluadora.
 *
 * Se salta cualquier URL que el guard de rutas no dejaría pasar (un menú mal
 * cargado con path `/` queda como `/app/`): redirigir ahí desde `/app`
 * sería un bucle, y desde "Sin acceso" un botón que no lleva a ningún lado.
 * `null` si no queda ninguna (menú vacío).
 */
export function getFirstNavUrl(items: NavItem[]): string | null {
  const urls = items.flatMap((item) => [item.url, ...(item.items ?? []).map((sub) => sub.url)])
  return urls.find((url) => canAccessPath(url, items)) ?? null
}
