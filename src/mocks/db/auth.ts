import type { User } from "@/types/api"

/**
 * Los roles del mock son los MISMOS strings que `public.role.name` en el SSO
 * (`PIGSE-ADMINISTRADOR`, `PIGSE-RECTOR`, …). No hay marcador ni traducción:
 * el JWT real lleva esos nombres en el claim `roles` y el front los lee tal
 * cual (ver `lib/auth-mapper.ts`), así que el mock tiene que hablar el mismo
 * idioma o los flujos por rol se prueban contra un contrato que no existe.
 */
export const authUsers: (User & {
  password: string
  /** Documento de identidad: con esto se recupera el usuario. */
  document: string
})[] = [
  {
    // Administrador: ve las dos secciones y escribe en las dos.
    id: "1",
    email: "admin@example.com",
    password: "password",
    name: "Admin Demo",
    role: "ADMIN",
    roles: ["PIGSE-ADMINISTRADOR"],
    document: "1020304050",
  },
  {
    // Rector: ve "Gestión documental" en modo LECTURA. En la BD el rector
    // no está en role_query de upload ni de la baja lógica.
    id: "4",
    email: "rector@example.com",
    password: "password",
    name: "Rector Demo",
    role: "USER",
    roles: ["PIGSE-RECTOR"],
    document: "1234567890",
  },
  {
    // Secretario/a: mismo módulo que el rector pero CON escritura.
    id: "5",
    email: "secretario@example.com",
    password: "password",
    name: "Secretario/a Demo",
    role: "USER",
    roles: ["PIGSE-SECRETARIO"],
    document: "2345678901",
  },
  {
    // Secretaria territorial: solo el tablero de monitoreo.
    id: "6",
    email: "territorial@example.com",
    password: "password",
    name: "Secretaria Territorial Demo",
    role: "USER",
    roles: ["PIGSE-SECRETARIA_TERRITORIAL"],
    document: "3456789012",
  },
  {
    // Caso real de la BD: un usuario acumula varios roles a la vez.
    id: "7",
    email: "multi@example.com",
    password: "password",
    name: "Nidya Ardila",
    role: "USER",
    roles: [
      "PIGSE-RECTOR",
      "PIGSE-SECRETARIO",
      "PIGSE-AUXILIAR_ADMINISTRATIVO",
      "PIGSE-JEFE_SISTEMA_ESTABLECIMIENTO",
    ],
    document: "4567890123",
  },
  {
    // Autenticado en el SSO pero SIN rol de PIGSE: cae en /no-autorizado.
    // En la BD hay ~34 usuarios así.
    id: "2",
    email: "user@example.com",
    password: "password",
    name: "Usuario Demo",
    role: "USER",
    roles: [],
    document: "1098765432",
  },
]

/** El usuario con el que se ingresa es el correo. */
export function findUserByDocument(document: string) {
  return authUsers.find((u) => u.document === document.trim())
}

export function findUserByCredentials(email: string, password: string) {
  return authUsers.find((u) => u.email === email && u.password === password)
}

// Token con forma de JWT (header.payload.signature, sin firma real) para que
// el front lo decodifique con el mismo mapper que usa contra el backend
// real: ver lib/auth-mapper.ts `toAuthUserFromToken` (claims `sub`/`roles`).
function base64url(json: unknown): string {
  // Un JWT real codifica el payload en UTF-8 antes del base64. `btoa` solo
  // acepta latin-1, así que un nombre con tilde ("Laura Martínez") saldría
  // mal —o rompería— sin este paso. El front hace el camino inverso al
  // decodificar (ver `decodeAccessToken` en lib/auth-mapper.ts).
  const utf8 = new TextEncoder().encode(JSON.stringify(json))
  const binary = String.fromCharCode(...utf8)
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

/**
 * Vida del access token del mock. El real vence de verdad (el gateway
 * responde `401 invalid_token` con "JWT expired ... ago"), así que el mock
 * también emite `exp`: sin él, el front nunca ejercitaba el camino de token
 * vencido y el bug solo aparecía contra el backend real.
 */
const ACCESS_TOKEN_TTL_SECONDS = 60 * 60

export function createMockAccessToken(user: User): string {
  const header = base64url({ alg: "none", typ: "JWT" })
  const issuedAt = Math.floor(Date.now() / 1000)
  const payload = base64url({
    sub: user.email,
    // El backend real trae el nombre en el token; sin este claim la barra
    // lateral muestra el prefijo del correo en vez del nombre de la persona.
    name: user.name,
    roles: user.roles,
    iat: issuedAt,
    exp: issuedAt + ACCESS_TOKEN_TTL_SECONDS,
  })
  return `${header}.${payload}.mock-signature`
}

/** Inversa de `base64url`: base64url -> bytes -> texto UTF-8. */
function decodeBase64Url(segment: string): string {
  const binary = atob(segment.replace(/-/g, "+").replace(/_/g, "/"))
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))
}

export function findUserByToken(token: string) {
  try {
    const payload = JSON.parse(decodeBase64Url(token.split(".")[1])) as { sub?: string }
    return payload.sub ? findUserByEmail(payload.sub) : undefined
  } catch {
    return undefined
  }
}

export function findUserByEmail(email: string) {
  return authUsers.find((u) => u.email === email)
}

/**
 * "carlos.mendoza@x.com" -> "car•••••@x.com". Enmascarar es tarea del
 * backend: la dirección completa nunca debe salir en la respuesta de
 * "recuperar usuario", donde alcanza con reconocerla.
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email
  return `${local.slice(0, 3)}${"•".repeat(Math.max(3, local.length - 3))}@${domain}`
}

// token -> email + vencimiento, simula el link que el backend real envía por
// correo. En el mock el token es estático y no se consume al usarlo: así el
// link /restore-password?token=... sigue funcionando entre recargas y se
// puede guardar en favoritos mientras se desarrolla la pantalla. Lo único
// que lo invalida es el tiempo.
export const MOCK_PASSWORD_RESET_TOKEN = "mock-reset-token"

/**
 * Vida del enlace de reseteo. En producción son 30 minutos; acá está en 10
 * segundos a propósito, para poder ver el contador llegar a cero y las
 * pantallas de "expiró" sin esperar.
 */
export const PASSWORD_RESET_TTL_SECONDS = 30 * 60

interface PasswordResetEntry {
  email: string
  /** Epoch ms en que se emitió (es decir, cuándo se "envió" el correo). */
  issuedAt: number
  /** Epoch ms en que el token deja de servir. */
  expiresAt: number
}

// Precargado con el usuario demo para que el token sirva aunque no se haya
// pasado antes por /forgot-password.
const passwordResetTokens = new Map<string, PasswordResetEntry>([
  [
    MOCK_PASSWORD_RESET_TOKEN,
    {
      email: authUsers[0].email,
      issuedAt: Date.now(),
      expiresAt: Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000,
    },
  ],
])

export function createPasswordResetToken(email: string): {
  token: string
  expiresIn: number
} {
  const issuedAt = Date.now()
  passwordResetTokens.set(MOCK_PASSWORD_RESET_TOKEN, {
    email,
    issuedAt,
    expiresAt: issuedAt + PASSWORD_RESET_TTL_SECONDS * 1000,
  })
  return {
    token: MOCK_PASSWORD_RESET_TOKEN,
    expiresIn: PASSWORD_RESET_TTL_SECONDS,
  }
}

export type PasswordResetTokenStatus = "valid" | "expired" | "invalid"

/**
 * Estado de un token de reseteo. El token es la única fuente: de él salen el
 * email al que se envió, cuándo se envió (`issuedAt`) y cuántos segundos le
 * quedan (`expiresIn`, 0 si venció o no existe). Eso es lo que alimenta la
 * pantalla de "revisa tu correo" sin necesidad de más query params.
 */
export function getPasswordResetTokenStatus(token: string): {
  status: PasswordResetTokenStatus
  expiresIn: number
  ttlSeconds: number
  maskedEmail?: string
  issuedAt?: number
} {
  const entry = passwordResetTokens.get(token)
  if (!entry) {
    return {
      status: "invalid",
      expiresIn: 0,
      ttlSeconds: PASSWORD_RESET_TTL_SECONDS,
    }
  }

  const remaining = Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000))
  return {
    status: remaining > 0 ? "valid" : "expired",
    expiresIn: remaining,
    ttlSeconds: PASSWORD_RESET_TTL_SECONDS,
    // Enmascarado desde acá: la dirección completa no sale en la respuesta.
    maskedEmail: maskEmail(entry.email),
    issuedAt: entry.issuedAt,
  }
}

/**
 * Devuelve el email asociado si el token todavía sirve. El segundo valor
 * distingue "no existe" de "venció" para que la UI muestre el mensaje
 * correcto.
 */
export function consumePasswordResetToken(token: string): {
  email?: string
  status: PasswordResetTokenStatus
} {
  const { status } = getPasswordResetTokenStatus(token)
  if (status !== "valid") return { status }
  return { email: passwordResetTokens.get(token)!.email, status }
}

/** Solo para probar el camino de vencimiento sin esperar 30 minutos. */
export function expirePasswordResetToken(token: string) {
  const entry = passwordResetTokens.get(token)
  if (entry) entry.expiresAt = Date.now()
}

export function setUserPassword(email: string, password: string) {
  const user = findUserByEmail(email)
  if (user) user.password = password
}
