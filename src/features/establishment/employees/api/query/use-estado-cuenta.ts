import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"

export type EstadoCuenta = "ACTIVE" | "PENDING_ACTIVATION" | "INACTIVE" | "NOT_FOUND"

interface EstadoCuentaRow {
  correo: string
  estado: EstadoCuenta
}

/** Normaliza el correo para usarlo como clave del mapa (el back no distingue mayúsculas). */
export function toCorreoKey(correo: string | null | undefined) {
  return (correo ?? "").trim().toLowerCase()
}

/**
 * Estado de la cuenta SSO de los funcionarios de la página actual, por
 * correo. Lo expone auth-center (`POST /auth/register/pigse/funcionario/
 * estado-cuenta`) y decide si el botón "Reenviar correo de activación" se
 * habilita (solo `PENDING_ACTIVATION`).
 *
 * Sin handler MSW: con mocks activos se asume que todas están pendientes
 * para poder probar el flujo.
 */
async function fetchEstadoCuenta(correos: string[]): Promise<Map<string, EstadoCuenta>> {
  const rows: EstadoCuentaRow[] = env.ENABLE_API_MOCKING
    ? correos.map((correo) => ({ correo, estado: "PENDING_ACTIVATION" }))
    : await api.post<EstadoCuentaRow[]>("/auth/register/pigse/funcionario/estado-cuenta", {
        correos,
      })
  return new Map((rows ?? []).map((row) => [toCorreoKey(row.correo), row.estado]))
}

export const estadoCuentaQueryKey = (correos: string[]) =>
  ["funcionarios-estado-cuenta", correos] as const

export function useEstadoCuentaQuery(correos: string[]) {
  return useQuery({
    queryKey: estadoCuentaQueryKey(correos),
    queryFn: () => fetchEstadoCuenta(correos),
    enabled: correos.length > 0,
  })
}
