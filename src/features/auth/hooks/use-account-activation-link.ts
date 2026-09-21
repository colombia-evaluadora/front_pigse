import { useActivationTokenStatusQuery } from "@/features/auth/api/query/use-activation-token-status-query"
import { useCountdown } from "@/features/auth/hooks/use-countdown"

export interface AccountActivationLink {
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
  /** Tiempo que le queda, listo para pintar ("9:07"). */
  remainingLabel: string | null
  /** Vida total del enlace, lista para pintar ("2 días"). */
  ttlLabel: string | null
}

/** 172800 -> "2 días"; 1800 -> "30 minutos"; 45 -> "45 segundos". */
function formatTtl(seconds: number): string {
  if (seconds < 60) return `${seconds} segundos`
  if (seconds < 3600) {
    const mins = Math.round(seconds / 60)
    return `${mins} ${mins === 1 ? "minuto" : "minutos"}`
  }
  if (seconds < 86400) {
    const hours = Math.round(seconds / 3600)
    return `${hours} ${hours === 1 ? "hora" : "horas"}`
  }
  const days = Math.round(seconds / 86400)
  return `${days} ${days === 1 ? "día" : "días"}`
}

/**
 * Estado del enlace de activación, resuelto de punta a punta — mismo patrón
 * que `usePasswordResetLink`, sobre `/activationTokenStatus` en vez de
 * `/resetTokenStatus`. La pantalla de "Activa tu cuenta" solo elige qué
 * card mostrar con los booleanos que devuelve.
 */
export function useAccountActivationLink(token: string | undefined): AccountActivationLink {
  const { data, isPending, isError } = useActivationTokenStatusQuery(token)
  const isChecking = !isError && isPending

  const countdown = useCountdown(data?.status === "valid" ? data.expiresIn : undefined)

  const isInvalid = !token || data?.status === "invalid"
  const isExpired = !isInvalid && (data?.status === "expired" || countdown.hasElapsed)

  return {
    isChecking: !isInvalid && isChecking,
    isInvalid,
    isExpired,
    isUsable: !isInvalid && !isExpired && (data?.status === "valid" || isError),
    maskedEmail: data?.maskedEmail ?? null,
    remainingLabel: countdown.label,
    ttlLabel: data?.ttlSeconds === undefined ? null : formatTtl(data.ttlSeconds),
  }
}
