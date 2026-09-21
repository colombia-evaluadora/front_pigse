import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import { activationTokenStatusQueryKey } from "@/features/auth/api/query/use-activation-token-status-query"

interface ActivateAccountInput {
  token: string
  password: string
}

function activateAccount(data: ActivateAccountInput): Promise<void> {
  return api.post("/sso-admin/activateAccount", data)
}

interface UseActivateAccountOptions {
  mutationConfig?: MutationConfig<typeof activateAccount>
}

export function useActivateAccount({ mutationConfig }: UseActivateAccountOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: activateAccount,
    ...mutationConfig,
    onError: (...args) => {
      const [, variables] = args
      queryClient.invalidateQueries({
        queryKey: activationTokenStatusQueryKey(variables.token),
      })
      mutationConfig?.onError?.(...args)
    },
  })
}
