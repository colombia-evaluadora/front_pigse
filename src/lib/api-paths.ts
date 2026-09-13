import { env } from "@/config/env"

/**
 * Resuelve la ruta a usar según el modo de la app: el mock (MSW) sigue
 * intercediendo las rutas "históricas" en inglés que ya tienen handlers y
 * tests escritos contra ellas; el backend real registra sus endpoints en
 * español (`/documentos`, `/cumplimiento/listar`, …) — confirmado contra la
 * tabla `public.query` del SSO.
 *
 * `/pigse` es el prefijo con el que el gateway enruta hacia el motor de
 * queries de esta app (microservice `pigse`, `id_microservice = 12`,
 * `requesturi: /api/pigse/**`, `id_app = 8`). TODO endpoint que resuelve en
 * la tabla `query` necesita ese prefijo en la URL real que sale del front,
 * aunque el `path_template` registrado ahí NO lo incluya — el gateway lo saca
 * antes de matchear contra `path_template`.
 *
 * Los endpoints que no pasan por ese motor no lo llevan:
 *   - `/api/auth/**`   → auth-center (login, refresh, logout)
 *   - `/api/files/**`  → file-service (upload multipart, view-token)
 *   - `/api/sso-admin/**` → sso-admin (forgot/restore password)
 *
 * @param mockPath Ruta que ya intercepta el handler de MSW.
 * @param realPath Ruta tal como está registrada en `public.query.path_template`,
 *   SIN el prefijo del microservicio (esta función lo agrega).
 * @param prefix Prefijo con el que el gateway rutea hacia la instancia que
 *   sirve ese endpoint. Ver `public.microservice.requesturi`.
 */
export function apiPath(mockPath: string, realPath: string, prefix = "/pigse"): string {
  return env.ENABLE_API_MOCKING ? mockPath : `${prefix}${realPath}`
}

/**
 * Prefijo de la instancia query-service dedicada a auditoría PIGSE
 * (microservice `audit-clickhouse-pigse`, `requesturi: /api/audit-pigse/**`,
 * V356). Antes era `/audit-ch` (V84), la instancia genérica compartida con
 * CEVAL — V356/V357 la partieron en dos por esquema; CEVAL pasó a
 * `/audit-cval` (ver front_colombia_evaluadora/src/lib/api-routes.ts) y esta
 * app a `/audit-pigse`. `/audit-ch` ya no existe: V357 le cambió el
 * `requesturi` a `audit-clickhouse-cval`, así que llamarlo hoy es un 404.
 */
export const AUDIT_API_PREFIX = "/audit-pigse"
