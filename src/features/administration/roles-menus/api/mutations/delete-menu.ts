import { useMutation, useQueryClient } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"
import type { MutationConfig } from "@/lib/react-query"

import { menusQueryKey } from "@/features/administration/roles-menus/api/query/use-menus-query"
import type { UpdateRoleMenusResult } from "@/features/administration/roles-menus/api/types/role-menu"

/**
 * Baja del menú. No es un DELETE: el backend expone un soft-delete en cascada
 * (el grupo se lleva a sus ítems) bajo `PUT /menus/{id}/eliminar`, que responde
 * `{status, message}`. Un id inexistente da 404, no un `status: "error"`.
 */
function deleteMenu({ id }: { id: number }): Promise<UpdateRoleMenusResult> {
  return pigse.putRow<UpdateRoleMenusResult>(`/menus/${id}/eliminar`)
}

interface UseDeleteMenuOptions {
  mutationConfig?: MutationConfig<typeof deleteMenu>
}

export function useDeleteMenu({ mutationConfig }: UseDeleteMenuOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteMenu,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: menusQueryKey() })
      // Borrar un menú también cambia lo que ve cada rol.
      queryClient.invalidateQueries({ queryKey: ["role-menus"] })
      queryClient.invalidateQueries({ queryKey: ["navigation", "menu"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
