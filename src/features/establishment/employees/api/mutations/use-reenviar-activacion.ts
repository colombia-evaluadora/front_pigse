import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"

/**
 * Reenvía el correo de activación a un funcionario cuya cuenta sigue
 * pendiente (`POST /auth/register/pigse/funcionario/reenviar-activacion`,
 * 204). Si la cuenta ya no está pendiente el back responde 409 con un
 * mensaje para el usuario. Sin handler MSW: con mocks activos es un no-op.
 */
export async function reenviarActivacion({ correo }: { correo: string }): Promise<void> {
  if (env.ENABLE_API_MOCKING) return
  await api.post("/auth/register/pigse/funcionario/reenviar-activacion", { correo })
}

export function useReenviarActivacion({
  mutationConfig,
}: { mutationConfig?: MutationConfig<typeof reenviarActivacion> } = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}
  return useMutation({
    mutationFn: reenviarActivacion,
    ...rest,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["funcionarios-estado-cuenta"] })
      return onSuccess?.(...args)
    },
  })
}
