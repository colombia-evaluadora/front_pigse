/**
 * Contratos de los flujos de recuperación (contraseña y usuario).
 *
 * Todo lo que la UI necesita decidir viene resuelto desde el backend: el
 * estado del enlace, cuánto le queda y el correo ya enmascarado. Las
 * pantallas no derivan reglas de negocio a partir de estos datos, solo los
 * pintan.
 */

/**
 * Respuesta de "olvidé mi contraseña". El backend real responde vacío —el
 * enlace viaja por correo—, así que ambos campos son opcionales; la API
 * mockeada sí devuelve el token para poder seguir el flujo sin bandeja de
 * entrada.
 */
export interface ForgotPasswordResponse {
  token?: string
  expiresIn?: number
}

export type ResetTokenStatus = "valid" | "expired" | "invalid"

export interface ResetTokenStatusResponse {
  status: ResetTokenStatus
  /** Segundos restantes; 0 si venció o el token no existe. */
  expiresIn: number
  /** Vida total del enlace, para poder decir "vence a los N minutos". */
  ttlSeconds: number
  /** Correo al que se envió, ya enmascarado. Ausente si el token no existe. */
  maskedEmail?: string
  /** Epoch ms en que se envió el enlace. */
  issuedAt?: number
}

/**
 * Respuesta de "no recuerdo mi usuario". El usuario *es* el correo con el
 * que se ingresa, y va completo: el documento con el que se consultó ya
 * hace de prueba de identidad.
 */
export interface ForgotUsernameResponse {
  username: string
}
