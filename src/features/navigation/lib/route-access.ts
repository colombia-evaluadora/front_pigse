/**
 * ¿Puede el usuario abrir esta URL? Lo decide SU menú (`GET /pigse/my-menus`,
 * ya filtrado por rol en el backend), no una tabla de roles en el front.
 *
 * Origen (QA): un usuario autenticado entraba a cualquier módulo escribiendo
 * la URL aunque no tuviera ese menú. El backend igual le negaba los datos,
 * pero la pantalla se abría (vacía o llena de errores). El guard de rutas
 * (`menuGuardRoute` en `router.tsx`) usa esta función para frenar la
 * navegación ANTES de montar la página.
 *
 * Regla (fail-closed): una ruta se permite si
 *
 * 1. es igual a la URL de un ítem del menú del usuario, o cuelga de ella con
 *    límite de segmento (`/app/gestion-documental/PEI` cuelga de
 *    `/app/gestion-documental`; `/app/gestion-documental-x` NO), o
 * 2. aparece en `ROUTE_MENU_OWNERS` (pantallas que no cuelgan de la URL de
 *    su menú) y el usuario tiene alguno de los menús dueños.
 *
 * Todo lo demás se niega. Por eso no hay "bypass" de super admin acá: el
 * Administrador entra a lo que su menú trae, igual que cualquier rol.
 *
 * Se compara contra el menú YA MAPEADO (`toNavItemDtos`), no contra las filas
 * crudas: el mapper descarta los `visible: false` y, sobre todo, el `path`
 * propio de un grupo con hijos — si contara, tener solo "Funcionarios" daría
 * acceso a todo `/app/establecimiento-educativo/*` por el path del grupo.
 * Mismo criterio que el sidebar: lo que no ves en el menú, no lo abrís.
 */

/** Lo único que el guard necesita del menú: la URL de cada ítem y de sus hijos. */
export interface MenuAccessEntry {
  url: string
  items?: { url: string }[]
}

interface RouteMenuOwner {
  /** Prefijo de la ruta (con `/app`), con límite de segmento. */
  path: string
  /** URLs de menú dueñas: alcanza con tener UNA. */
  menus: readonly string[]
}

/**
 * Pantallas que NO cuelgan de la URL del menú al que pertenecen. Cada
 * entrada tiene que poder justificarse con el flujo real de la app (desde qué
 * menú se llega); lo que no esté acá ni cuelgue de un menú queda bloqueado.
 *
 * Si agregás una ruta hermana de un ítem de menú (no debajo de él), sumala
 * acá y en el test, o el guard la bloquea para todos.
 */
export const ROUTE_MENU_OWNERS: readonly RouteMenuOwner[] = [
  // Agregar y editar establecimiento viven AL LADO de la lista (`/agregar`,
  // `/editar/$id` vs `/general`), no debajo: pertenecen al ítem
  // "Establecimiento" (mismo alias que `NAV_PATH_ALIASES` en nav-main.tsx).
  {
    path: "/app/establecimiento-educativo/agregar",
    menus: ["/app/establecimiento-educativo/general"],
  },
  {
    path: "/app/establecimiento-educativo/editar",
    menus: ["/app/establecimiento-educativo/general"],
  },
  // Registro de actividad: un solo ítem de menú (apunta a `/sesiones`) para
  // dos vistas hermanas (`/sesiones` y `/tablas`, con sus detalles).
  {
    path: "/app/registro-de-actividad",
    menus: ["/app/registro-de-actividad/sesiones"],
  },
  // El visor de PDF no es ítem de menú: lo abren "Gestión documental"
  // (Consultar un anexo) y "Monitoreo y cumplimiento" (el dot verde de un EE,
  // `compliance-status-cell.tsx`). Basta con tener cualquiera de los dos.
  {
    path: "/app/visor",
    menus: ["/app/gestion-documental", "/app/monitoreo-cumplimiento"],
  },
  // Fecha límite de Gestión documental (V522): no tiene ítem de menú propio.
  // Decisión de producto: la abre quien tenga Gestión documental o Monitoreo
  // y cumplimiento (Secretaria Territorial administra el plazo desde
  // Monitoreo; las escrituras igual las filtra el backend por rol).
  {
    path: "/app/administracion/gestion-documental/fecha-limite",
    menus: ["/app/gestion-documental", "/app/monitoreo-cumplimiento"],
  },
]

/**
 * Forma canónica de un path para comparar: sin query/hash, segmentos
 * decodificados y en minúsculas (el router matchea sin distinguir
 * mayúsculas), sin barras repetidas ni barra final.
 *
 * Devuelve `null` —y el guard niega— si el path no es confiable: un
 * `%` mal formado, o segmentos `.`/`..` (o `/`/`\` codificados) que podrían
 * hacer que el texto "cuelgue" de un menú permitido mientras el router
 * resuelve otra pantalla.
 */
export function normalizePath(path: string): string | null {
  const [pathname] = path.split(/[?#]/)
  const segments: string[] = []
  for (const raw of pathname.split("/")) {
    if (!raw) continue
    let segment: string
    try {
      segment = decodeURIComponent(raw)
    } catch {
      return null
    }
    if (segment === "." || segment === ".." || /[/\\]/.test(segment)) return null
    segments.push(segment.toLowerCase())
  }
  return `/${segments.join("/")}`
}

function isSameOrUnder(path: string, base: string): boolean {
  return path === base || path.startsWith(`${base}/`)
}

/**
 * URLs del menú normalizadas (ítems + hijos). Se descartan las que no
 * apuntan a una pantalla concreta (`/` o `/app` a secas): un menú mal cargado
 * con path vacío o `/` daría acceso a TODO `/app/*` por la regla de prefijo.
 */
export function getMenuUrls(menu: readonly MenuAccessEntry[]): string[] {
  const urls = menu.flatMap((item) => [item.url, ...(item.items ?? []).map((sub) => sub.url)])
  return urls
    .map((url) => (url ? normalizePath(url) : null))
    .filter((url): url is string => url !== null && url !== "/" && url !== "/app")
}

function isGrantedByMenu(path: string, menuUrls: readonly string[]): boolean {
  return menuUrls.some((url) => isSameOrUnder(path, url))
}

/** ¿El menú del usuario le da acceso a esta URL? Ver la regla arriba. */
export function canAccessPath(pathname: string, menu: readonly MenuAccessEntry[]): boolean {
  const path = normalizePath(pathname)
  if (!path) return false

  const menuUrls = getMenuUrls(menu)
  if (isGrantedByMenu(path, menuUrls)) return true

  const owner = ROUTE_MENU_OWNERS.find((rule) => isSameOrUnder(path, rule.path))
  return owner ? owner.menus.some((menuUrl) => isGrantedByMenu(menuUrl, menuUrls)) : false
}
