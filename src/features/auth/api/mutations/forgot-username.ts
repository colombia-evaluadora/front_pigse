import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ForgotUsernameResponse } from "@/features/auth/api/types/password-recovery"

function forgotUsername(document: string): Promise<ForgotUsernameResponse> {
  return api.get("/sso-admin/forgotUsername", { params: { document } })
}

interface UseForgotUsernameOptions {
  mutationConfig?: MutationConfig<typeof forgotUsername>
}

export function useForgotUsername({ mutationConfig }: UseForgotUsernameOptions = {}) {
  return useMutation({
    mutationFn: forgotUsername,
    ...mutationConfig,
  })
}
