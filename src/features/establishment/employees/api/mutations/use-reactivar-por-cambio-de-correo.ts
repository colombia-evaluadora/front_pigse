import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

export interface CambioCorreoInput {
  correoAnterior: string
  correoNuevo: string
}

/**
 * Cambio de correo de un funcionario: la edición (PATCH por query-service)
 * sincroniza el correo a `public.users` en SQL, que no puede mandar correos.
 * Después de guardar, este POST a auth-center deja la cuenta pendiente de
 * activación y envía el correo de activación al correo NUEVO (enlace de
 * PIGSE; la app sale de la ruta `pigse`). Mismo gate de permisos
 * que `POST /register/pigse/funcionario`.
 *
 * El backend exige que el cambio ya esté guardado (rechaza con 400 si la
 * cuenta todavía tiene el correo anterior), así que solo se llama tras un
 * guardado exitoso. Sin handler MSW: con mocks activos es un no-op.
 */
export async function reactivarPorCambioDeCorreo(input: CambioCorreoInput): Promise<void> {
  if (env.ENABLE_API_MOCKING) return
  await api.post("/auth/register/pigse/funcionario/reactivar-por-cambio-de-correo", input)
}

export function useReactivarPorCambioDeCorreo({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof reactivarPorCambioDeCorreo> } = {}) {
  return useMutation({ mutationFn: reactivarPorCambioDeCorreo, ...mutationConfig })
}

/** true si el correo cambió de verdad (sin distinguir mayúsculas ni espacios). */
export function correoCambio(anterior: string | null | undefined, nuevo: string | null | undefined) {
  const a = (anterior ?? "").trim().toLowerCase()
  const n = (nuevo ?? "").trim().toLowerCase()
  return a !== "" && n !== "" && a !== n
}
