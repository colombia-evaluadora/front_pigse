import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { resetTokenStatusQueryKey } from "@/features/auth/api/query/use-reset-token-status-query"

interface RestorePasswordInput {
  token: string
  password: string
}

function restorePassword(data: RestorePasswordInput): Promise<void> {
  return api.post("/sso-admin/restorePassword", data)
}

interface UseRestorePasswordOptions {
  mutationConfig?: MutationConfig<typeof restorePassword>
}

export function useRestorePassword({ mutationConfig }: UseRestorePasswordOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: restorePassword,
    ...mutationConfig,
    onError: (...args) => {
      const [, variables] = args
      queryClient.invalidateQueries({
        queryKey: resetTokenStatusQueryKey(variables.token),
      })
      mutationConfig?.onError?.(...args)
    },
  })
}
