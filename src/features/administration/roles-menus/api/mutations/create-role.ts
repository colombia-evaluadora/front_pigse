import { useMutation, useQueryClient } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"
import type { MutationConfig } from "@/lib/react-query"

import { rolesQueryKey } from "@/features/administration/roles-menus/api/query/use-roles-query"
import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"

function createRole({ name }: { name: string }): Promise<Role> {
  return pigse.postRow<Role>("/roles", { name })
}

interface UseCreateRoleOptions {
  mutationConfig?: MutationConfig<typeof createRole>
}

export function useCreateRole({ mutationConfig }: UseCreateRoleOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createRole,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: rolesQueryKey() })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
