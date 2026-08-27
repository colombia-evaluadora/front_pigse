import { useEffect, useState } from "react"

export interface Countdown {
  /** Segundos restantes. `null` mientras no se sepa. */
  seconds: number | null
  /** Listo para pintar: "9:07". `null` si no hay cuenta corriendo. */
  label: string | null
  /** `true` solo cuando la cuenta llegó a cero (no cuando aún se desconoce). */
  hasElapsed: boolean
}

function format(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

/**
 * Cuenta regresiva de `expiresIn` segundos, resuelta enteramente en el
 * cliente: arranca del valor que dio el servidor y descuenta contra un
 * `deadline` fijo, así no acumula drift ni hace peticiones. Al volver de una
 * pestaña en segundo plano se recalcula contra el reloj, no contra los ticks
 * perdidos.
 */
export function useCountdown(expiresIn: number | undefined): Countdown {
  const [seconds, setSeconds] = useState<number | null>(null)

  useEffect(() => {
    if (expiresIn === undefined) {
      setSeconds(null)
      return
    }

    const deadline = Date.now() + expiresIn * 1000
    const tick = () => setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)))

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresIn])

  return {
    seconds,
    label: seconds === null ? null : format(seconds),
    hasElapsed: seconds === 0,
  }
}
