import { useMutation, useQueryClient } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"
import type { MutationConfig } from "@/lib/react-query"

import { menusQueryKey } from "@/features/administration/roles-menus/api/query/use-menus-query"
import type { MenuOrderItem } from "@/features/administration/roles-menus/api/types/role-menu"

/**
 * Guarda el `menuOrder` de los menús que cambiaron de lugar. Va en una sola
 * llamada —y no un PATCH por menú— porque mover uno corre a todos sus
 * hermanos: si se mandaran de a uno, el menú quedaría con un orden a medio
 * aplicar ante cualquier error en el medio.
 */
function reorderMenus(items: MenuOrderItem[]): Promise<void> {
  return pigse.put("/menus/order", { items })
}

interface UseReorderMenusOptions {
  mutationConfig?: MutationConfig<typeof reorderMenus>
}

export function useReorderMenus({ mutationConfig }: UseReorderMenusOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: reorderMenus,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: menusQueryKey() })
      // El orden es el mismo que pinta el menú lateral.
      queryClient.invalidateQueries({ queryKey: ["navigation", "menu"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
