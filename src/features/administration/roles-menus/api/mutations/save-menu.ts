import { useMutation, useQueryClient } from "@tanstack/react-query"

import { pigse } from "@/lib/pigse-client"
import type { MutationConfig } from "@/lib/react-query"

import { menusQueryKey } from "@/features/administration/roles-menus/api/query/use-menus-query"
import type { MenuNode } from "@/features/administration/roles-menus/api/types/role-menu"

export interface MenuFormValues {
  name: string
  path: string
  icon: string
  /** `null` = menú principal (grupo raíz). */
  idParent: number | null
  visible?: boolean
  planId?: number | null
}

interface SaveMenuInput extends MenuFormValues {
  /** Sin id se crea; con id se edita. */
  id?: number
}

function saveMenu({ id, ...values }: SaveMenuInput): Promise<MenuNode> {
  return id == null
    ? pigse.postRow<MenuNode>("/menus", values)
    : pigse.patchRow<MenuNode>(`/menus/${id}`, values)
}

interface UseSaveMenuOptions {
  mutationConfig?: MutationConfig<typeof saveMenu>
}

export function useSaveMenu({ mutationConfig }: UseSaveMenuOptions = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: saveMenu,
    ...mutationConfig,
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: menusQueryKey() })
      queryClient.invalidateQueries({ queryKey: ["navigation", "menu"] })
      mutationConfig?.onSuccess?.(...args)
    },
  })
}
