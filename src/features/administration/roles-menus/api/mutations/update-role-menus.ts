import { useMutation, useQueryClient } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"
import type { MutationConfig } from "@/lib/react-query"

import { roleMenusQueryKey } from "@/features/administration/roles-menus/api/query/use-role-menus-query"
import type { UpdateRoleMenusResult } from "@/features/administration/roles-menus/api/types/role-menu"

interface UpdateRoleMenusInput {
  roleId: number
  menuIds: number[]
}

function updateRoleMenus({
  roleId,
  menuIds,
}: UpdateRoleMenusInput): Promise<UpdateRoleMenusResult> {
  return pigse.putRow<UpdateRoleMenusResult>(`/roles/${roleId}/menus`, { menuIds })
}

interface UseUpdateRoleMenusOptions {
  mutationConfig?: MutationConfig<typeof updateRoleMenus>
}

export function useUpdateRoleMenus({ mutationConfig }: UseUpdateRoleMenusOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateRoleMenus,
    ...mutationConfig,
    onSuccess: (data, variables, ...rest) => {
      queryClient.invalidateQueries({ queryKey: roleMenusQueryKey(variables.roleId) })
      // El menú lateral del usuario sale del mismo catálogo: si cambian los
      // permisos de su rol, hay que volver a pedirlo.
      queryClient.invalidateQueries({ queryKey: ["navigation", "menu"] })
      mutationConfig?.onSuccess?.(data, variables, ...rest)
    },
  })
}
