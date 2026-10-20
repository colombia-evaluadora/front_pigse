/**
 * Credenciales de la suite E2E. Se leen SOLO de variables de entorno: nunca
 * las escribas en un archivo del repo (ni en `.env`, que tampoco se versiona
 * pero queda en disco).
 *
 * - `PIGSE_TEST_USER` / `PIGSE_TEST_PASS`: cuenta principal (administrador
 *   PIGSE / super admin). Obligatoria.
 * - `PIGSE_TEST_RECTOR_USER` / `PIGSE_TEST_RECTOR_PASS`: opcional, una cuenta
 *   VINCULADA a un establecimiento de prueba (Rector/Secretario). Gestión
 *   documental es por establecimiento propio: sin esta cuenta, las pruebas de
 *   carga de documentos se saltan.
 * - `PIGSE_TEST_RESET_EMAIL`: opcional, correo (de prueba, `@example.com`) del
 *   funcionario al que se le envía "restablecer contraseña". Si falta, se usa
 *   el primer funcionario con correo `@example.com`.
 */
export interface Credentials {
  user: string
  pass: string
}

function pair(userVar: string, passVar: string): Credentials | null {
  const user = process.env[userVar]?.trim()
  const pass = process.env[passVar]
  return user && pass ? { user, pass } : null
}

export const adminCredentials = pair("PIGSE_TEST_USER", "PIGSE_TEST_PASS")
export const rectorCredentials = pair("PIGSE_TEST_RECTOR_USER", "PIGSE_TEST_RECTOR_PASS")
export const resetEmail = process.env.PIGSE_TEST_RESET_EMAIL?.trim() || null

export function requireAdmin(): Credentials {
  if (!adminCredentials) {
    throw new Error("Faltan PIGSE_TEST_USER / PIGSE_TEST_PASS (ver README, sección E2E).")
  }
  return adminCredentials
}
