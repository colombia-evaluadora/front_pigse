import { PIGSE_ROLES, hasAnyRole } from "@/lib/auth-mapper"
import type { User } from "@/types/api"

/**
 * Reglas de acceso a rutas del aplicativo por rol de PIGSE.
 *
 * **Esta tabla es un espejo del backend, no la fuente de verdad.** El permiso
 * real vive en `public.role_query` (query -> roles) y `public.role_route`
 * (menú -> roles) del SSO; el gateway rechaza con 403 lo que no corresponda.
 * Acá se replica para poder ocultar/redirigir en el cliente ANTES de pegarle
 * al backend — mejor UX que un 403 en la cara.
 *
 * Si cambiás permisos en la BD, hay que actualizar esta tabla. La consulta
 * que la genera:
 *
 * ```sql
 * SELECT q.path_template, q.http_method,
 *        string_agg(r.name, ', ' ORDER BY r.name) AS roles
 *   FROM query q
 *   LEFT JOIN role_query rq ON rq.query_id = q.id_query
 *   LEFT JOIN role r        ON r.id_role   = rq.role_id
 *  WHERE q.microservice_id = 12          -- microservice 'pigse'
 *  GROUP BY q.id_query, q.path_template, q.http_method;
 * ```
 *
 * Los `prefix` se matchean contra el pathname **relativo** a `/app`
 * (`/app/gestion-documental` -> `/gestion-documental`).
 */

/** Roles que pueden VER el módulo de gestión documental (`GET /documentos`). */
export const DOCUMENT_READERS = [
  PIGSE_ROLES.Administrador,
  PIGSE_ROLES.Rector,
  PIGSE_ROLES.Secretario,
] as const

/**
 * Roles que pueden ESCRIBIR (subir / dar de baja) documentos.
 *
 * El Rector queda afuera a propósito: en la BD, `POST /documentos/upload` y
 * `PATCH /documentos/:TIPO` sólo aceptan ADMINISTRADOR y SECRETARIO. El
 * Rector entra al módulo en modo lectura.
 */
export const DOCUMENT_WRITERS = [PIGSE_ROLES.Administrador, PIGSE_ROLES.Secretario] as const

/** Roles que pueden ver el tablero de monitoreo (`GET /cumplimiento/*`). */
export const COMPLIANCE_VIEWERS = [
  PIGSE_ROLES.Administrador,
  PIGSE_ROLES.SecretariaTerritorial,
  PIGSE_ROLES.DirectorEnteTerritorial,
  PIGSE_ROLES.JefeAreaCalidad,
  PIGSE_ROLES.JefeAreaCobertura,
  PIGSE_ROLES.JefeAreaPlaneacion,
  PIGSE_ROLES.JefeSistemaEnteTerritorial,
] as const

interface AccessRule {
  prefix: string
  allowedRoles: readonly string[]
}

const ROUTE_ACCESS: AccessRule[] = [
  { prefix: "/administracion", allowedRoles: [PIGSE_ROLES.Administrador] },
  { prefix: "/establecimiento-educativo", allowedRoles: [PIGSE_ROLES.Administrador] },
  { prefix: "/gestion-documental", allowedRoles: DOCUMENT_READERS },
  { prefix: "/monitoreo-cumplimiento", allowedRoles: COMPLIANCE_VIEWERS },
  // El visor no es ítem de menú: lo abren tanto "Gestión documental" (al
  // Consultar un documento) como "Monitoreo y cumplimiento" (al clickear el
  // dot verde de un EE). Por eso acepta la unión de los dos conjuntos.
  {
    prefix: "/visor",
    allowedRoles: [...new Set<string>([...DOCUMENT_READERS, ...COMPLIANCE_VIEWERS])],
  },
]

type MaybeUser = Pick<User, "roles"> | null | undefined

/** ¿El usuario puede subir / dar de baja documentos? */
export function canWriteDocuments(user: MaybeUser): boolean {
  return hasAnyRole(user, DOCUMENT_WRITERS)
}

/**
 * Primera ruta absoluta (con `/app`) que el usuario puede ver. Alimenta el
 * redirect de `/app` y el botón "Ir a mi inicio" de la pantalla 403.
 *
 * Si no matchea ninguna regla devuelve `/app/no-autorizado`: es un usuario
 * autenticado en el SSO pero sin ningún rol de PIGSE — pasa de verdad (en la
 * BD hay ~34 usuarios sin rol PIGSE), y mandarlo a `/login` lo dejaría en un
 * bucle porque su sesión SÍ es válida.
 */
export function findFirstAllowedPath(user: MaybeUser): string {
  for (const rule of ROUTE_ACCESS) {
    if (hasAnyRole(user, rule.allowedRoles)) return `/app${rule.prefix}`
  }
  return "/app/no-autorizado"
}

/**
 * ¿El usuario puede visitar `pathname`?
 *
 * Las rutas no listadas se permiten (`/app/no-autorizado` misma, por
 * ejemplo). Las listadas exigen intersección con `allowedRoles`.
 */
export function canAccessPath(pathname: string, user: MaybeUser): boolean {
  const relative = pathname.replace(/^\/app/, "")
  if (relative === "" || relative === "/") return true

  for (const rule of ROUTE_ACCESS) {
    if (relative === rule.prefix || relative.startsWith(`${rule.prefix}/`)) {
      return hasAnyRole(user, rule.allowedRoles)
    }
  }
  return true
}
