import { useMutation } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ForgotPasswordResponse } from "@/features/auth/api/types/password-recovery"

function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return api.get("/sso-admin/forgotPassword", {
    params: { email, app: env.NAME },
  })
}

interface UseForgotPasswordOptions {
  mutationConfig?: MutationConfig<typeof forgotPassword>
}

export function useForgotPassword({ mutationConfig }: UseForgotPasswordOptions = {}) {
  return useMutation({
    mutationFn: forgotPassword,
    ...mutationConfig,
  })
}
