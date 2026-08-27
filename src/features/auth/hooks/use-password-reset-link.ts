import { useResetTokenStatusQuery } from "@/features/auth/api/query/use-reset-token-status-query"
import { useCountdown } from "@/features/auth/hooks/use-countdown"

export interface PasswordResetLink {
  /** Todavía no se sabe nada del enlace. */
  isChecking: boolean
  /** No hay token, o el servidor no lo reconoce. */
  isInvalid: boolean
  /** Venció: lo dijo el servidor o lo alcanzó la cuenta regresiva. */
  isExpired: boolean
  /** Sirve: se puede mostrar el formulario. */
  isUsable: boolean
  /** Correo destino, ya enmascarado por el backend. */
  maskedEmail: string | null
  /** Hora a la que salió el correo, lista para pintar ("14:32"). */
  issuedAtLabel: string | null
  /** Tiempo que le queda, listo para pintar ("9:07"). */
  remainingLabel: string | null
  /** Vida total del enlace, lista para pintar ("30 minutos"). */
  ttlLabel: string | null
}

/** 1800 -> "30 minutos"; 45 -> "45 segundos". */
function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds} segundos`
  const mins = Math.round(seconds / 60)
  return `${mins} ${mins === 1 ? "minuto" : "minutos"}`
}

/** "14:32" — la hora a la que salió el correo. */
function formatIssuedAt(issuedAt: number): string {
  return new Date(issuedAt).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Estado del enlace de recuperación, resuelto de punta a punta: consulta al
 * servidor, cuenta regresiva en el cliente y los textos ya formateados. Las
 * pantallas solo eligen qué card mostrar con los booleanos que devuelve.
 */
export function usePasswordResetLink(token: string | undefined): PasswordResetLink {
  const { data, isPending, isError } = useResetTokenStatusQuery(token)
  // La consulta ya terminó (con error) — no tiene sentido seguir mostrando el
  // spinner esperando un estado que no va a llegar.
  const isChecking = !isError && isPending

  // El contador solo corre si el enlace llegó vivo; si ya venía vencido no
  // hay nada que descontar.
  const countdown = useCountdown(data?.status === "valid" ? data.expiresIn : undefined)

  // Solo el servidor decide que un enlace no sirve. Si la consulta falla
  // (hoy el gateway responde 401 porque `resetTokenStatus` todavía no existe
  // en sso-admin) seguimos mostrando el formulario: quien rechaza el token
  // de verdad es `restorePassword` al enviar. Marcarlo inválido acá dejaría
  // la pantalla muerta por un endpoint que falta.
  const isInvalid = !token || data?.status === "invalid"
  const isExpired = !isInvalid && (data?.status === "expired" || countdown.hasElapsed)

  return {
    isChecking: !isInvalid && isChecking,
    isInvalid,
    isExpired,
    // Sin respuesta del servidor (endpoint caído o inexistente) el enlace se
    // considera usable: el veredicto real lo da el submit.
    isUsable: !isInvalid && !isExpired && (data?.status === "valid" || isError),
    maskedEmail: data?.maskedEmail ?? null,
    issuedAtLabel: data?.issuedAt === undefined ? null : formatIssuedAt(data.issuedAt),
    remainingLabel: countdown.label,
    ttlLabel: data?.ttlSeconds === undefined ? null : formatTtl(data.ttlSeconds),
  }
}
