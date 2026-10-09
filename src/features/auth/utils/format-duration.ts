/**
 * Textos de duración de los enlaces de recuperación y activación. El backend
 * da la vida del enlace en segundos (`ttlSeconds`/`expiresIn`), y hoy dura
 * 2 días la recuperación y 7 la activación (TokenService en sso-admin): en
 * minutos crudos la pantalla decía "2880 minutos" y la cuenta regresiva
 * "2879:59", que no se entiende de un vistazo.
 */

const plural = (n: number, singular: string, plural: string) =>
  `${n} ${n === 1 ? singular : plural}`

/** Vida total del enlace: 172800 -> "2 días"; 5400 -> "2 horas"; 1800 -> "30 minutos". */
export function formatTtl(seconds: number): string {
  if (seconds < 60) return plural(seconds, "segundo", "segundos")
  if (seconds < 3600) return plural(Math.round(seconds / 60), "minuto", "minutos")
  if (seconds < 86400) return plural(Math.round(seconds / 3600), "hora", "horas")
  return plural(Math.round(seconds / 86400), "día", "días")
}

/**
 * Tiempo restante de la cuenta regresiva. Por debajo de una hora va al
 * segundo ("9:07"); por encima, en días/horas/minutos, que además no cambia
 * cada segundo (el `aria-live` no lo relee a cada tick).
 * 604799 -> "6 días y 23 h"; 86400 -> "1 día"; 5400 -> "1 h 30 min"; 547 -> "9:07".
 */
export function formatRemaining(seconds: number): string {
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, "0")}`
  }
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  if (days > 0) {
    const d = plural(days, "día", "días")
    return hours > 0 ? `${d} y ${hours} h` : d
  }
  const mins = Math.floor((seconds % 3600) / 60)
  return mins > 0 ? `${hours} h ${mins} min` : `${hours} h`
}
