import type { Role, User } from "@/types/api"

/**
 * Roles de la app PIGSE, tal cual están en `public.role.name` del SSO.
 *
 * El backend los nombra `'PIGSE-' || TROL.CODIGO` y son EXACTAMENTE los
 * strings que viajan en el claim `roles` del JWT: la query `/my-menus`
 * (`id_query = 200`) cruza `:CONTEXT.ROLES_ARRAY::text[]` contra
 * `role.name`, así que el token lleva nombres, no ids.
 *
 * Por eso el front trabaja con nombres y no con un catálogo numérico:
 * agregar un rol en la BD no obliga a tocar un mapa de ids acá.
 */
export const PIGSE_ROLES = {
  Administrador: "PIGSE-ADMINISTRADOR",
  Rector: "PIGSE-RECTOR",
  Secretario: "PIGSE-SECRETARIO",
  SecretariaTerritorial: "PIGSE-SECRETARIA_TERRITORIAL",
  AuxiliarAdministrativo: "PIGSE-AUXILIAR_ADMINISTRATIVO",
  DirectorEnteTerritorial: "PIGSE-DIRECTOR_ENTE_TERRITORIAL",
  JefeAreaCalidad: "PIGSE-JEFE_AREA_CALIDAD",
  JefeAreaCobertura: "PIGSE-JEFE_AREA_COBERTURA",
  JefeAreaPlaneacion: "PIGSE-JEFE_AREA_PLANEACION",
  JefeSistemaEnteTerritorial: "PIGSE-JEFE_SISTEMA_ENTE_TERRITORIAL",
  JefeSistemaEstablecimiento: "PIGSE-JEFE_SISTEMA_ESTABLECIMIENTO",
} as const

export type PigseRole = (typeof PIGSE_ROLES)[keyof typeof PIGSE_ROLES]

/** Solo los roles de PIGSE del token; se descarta lo de otras apps. */
export function getPigseRoles(user: Pick<User, "roles"> | null | undefined): string[] {
  if (!user?.roles) return []
  return user.roles.filter((claim) => claim.startsWith("PIGSE-"))
}

/**
 * ¿El usuario tiene alguno de estos roles?
 *
 * Un usuario puede acumular varios (en la BD hay quien es RECTOR +
 * SECRETARIO + AUXILIAR a la vez), así que el chequeo es de intersección,
 * nunca de igualdad contra "el" rol del usuario — ese concepto no existe.
 */
export function hasAnyRole(
  user: Pick<User, "roles"> | null | undefined,
  allowed: readonly string[],
): boolean {
  const roles = getPigseRoles(user)
  return roles.some((role) => allowed.includes(role))
}

export interface AuthUser extends User {
  initials: string
  /** `true` si el token trae el claim `PIGSE-ADMINISTRADOR`. */
  isSuperAdmin: boolean
}

export function toAuthUser(user: User): AuthUser {
  const [first, second] = user.name.trim().split(/\s+/)
  return {
    ...user,
    initials: `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase(),
    isSuperAdmin: user.roles.includes(PIGSE_ROLES.Administrador),
  }
}

interface AccessTokenClaims {
  sub: string
  roles: string[]
  /** Opcional: no todo emisor de tokens lo manda. */
  name?: string
}

// El backend SSO no devuelve un objeto "usuario" en /auth/login ni
// /auth/refresh, solo el access token — el usuario se deriva de sus claims
// (`sub` = email, `roles`). No se verifica la firma acá: la firma ya fue
// validada por el backend al emitir/aceptar el token; esto solo lee el
// payload para pintar la UI.
function decodeAccessToken(token: string): AccessTokenClaims | null {
  try {
    const payload = token.split(".")[1]
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/")
    // El payload de un JWT es UTF-8 en base64url: `atob` devuelve bytes, no
    // texto. Sin este paso, cualquier claim con tilde (un nombre, por
    // ejemplo) llega roto.
    const binary = atob(base64)
    const json = new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
    const claims = JSON.parse(json) as Partial<AccessTokenClaims>
    if (!claims.sub || !Array.isArray(claims.roles)) return null
    return { sub: claims.sub, roles: claims.roles, name: claims.name }
  } catch {
    return null
  }
}

export function toAuthUserFromToken(token: string): AuthUser | null {
  const claims = decodeAccessToken(token)
  if (!claims) return null

  const role: Role = claims.roles.includes(PIGSE_ROLES.Administrador) ? "ADMIN" : "USER"
  return toAuthUser({
    id: claims.sub,
    email: claims.sub,
    // Sin claim `name` queda el prefijo del correo: no es bonito, pero es
    // lo único que hay para identificar a la persona en pantalla.
    name: claims.name ?? claims.sub.split("@")[0],
    role,
    roles: claims.roles,
  })
}
