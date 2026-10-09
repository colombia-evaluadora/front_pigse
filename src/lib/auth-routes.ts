import { PIGSE_ROLES, hasAnyRole } from "@/lib/auth-mapper"
import type { User } from "@/types/api"

/**
 * Capacidades finas por rol de PIGSE dentro de una pantalla (¿puede
 * escribir?, ¿puede fijar la fecha límite?).
 *
 * **Qué pantallas puede ABRIR cada usuario no se decide acá**: lo decide su
 * menú (`GET /pigse/my-menus`, `role_route` del SSO) en el guard de rutas
 * (`menuGuardRoute` en `router.tsx` + `features/navigation/lib/
 * route-access.ts`). La vieja tabla `ROUTE_ACCESS` / `findFirstAllowedPath`
 * que vivía en este archivo replicaba `role_route` a mano, se desincronizaba
 * y podía mandar a un usuario a una ruta que el guard después bloquea: se
 * borró.
 *
 * **Estas listas son un espejo del backend, no la fuente de verdad.** El
 * permiso real vive en `public.role_query` (query -> roles) del SSO; el
 * gateway rechaza con 403 lo que no corresponda. Acá se replica solo para
 * ocultar/deshabilitar acciones ANTES de pegarle al backend — mejor UX que
 * un 403 en la cara. Si cambiás permisos en la BD, hay que actualizarlas. La
 * consulta que las genera:
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
 */

/**
 * Roles que pueden ESCRIBIR (subir / dar de baja) documentos.
 *
 * V521: el Rector gana los mismos permisos de escritura que el Secretario
 * (`POST /documentos/upload`, `PATCH /documentos/:TIPO/categorias/:CATEGORIA`
 * ya aceptan PIGSE-RECTOR en la BD) — pedido explícito, antes entraba al
 * módulo en modo lectura.
 */
export const DOCUMENT_WRITERS = [
  PIGSE_ROLES.Administrador,
  PIGSE_ROLES.Secretario,
  PIGSE_ROLES.Rector,
] as const

/**
 * Roles que pueden VER la fecha límite global de Gestión documental y sus
 * excepciones por establecimiento (V522, `GET /documentos/fecha-limite`).
 * Los mismos que ya ven el módulo, más Secretaria Territorial (que no
 * tiene por qué ver los documentos en sí, pero sí administra el plazo).
 */
export const DOCUMENT_DEADLINE_READERS = [
  PIGSE_ROLES.Administrador,
  PIGSE_ROLES.Rector,
  PIGSE_ROLES.Secretario,
  PIGSE_ROLES.SecretariaTerritorial,
] as const

/**
 * Roles que pueden FIJAR la fecha límite global y gestionar excepciones
 * por establecimiento (V522). Distinto de `DOCUMENT_WRITERS`: acá NO
 * entran Rector/Secretario (ellos suben documentos, no deciden el plazo),
 * pero sí Secretaria Territorial.
 */
export const DOCUMENT_DEADLINE_WRITERS = [
  PIGSE_ROLES.Administrador,
  PIGSE_ROLES.SecretariaTerritorial,
] as const

type MaybeUser = Pick<User, "roles"> | null | undefined

/** ¿El usuario puede subir / dar de baja documentos? */
export function canWriteDocuments(user: MaybeUser): boolean {
  return hasAnyRole(user, DOCUMENT_WRITERS)
}

/** ¿El usuario puede fijar la fecha límite global o gestionar excepciones? */
export function canWriteDocumentDeadline(user: MaybeUser): boolean {
  return hasAnyRole(user, DOCUMENT_DEADLINE_WRITERS)
}
