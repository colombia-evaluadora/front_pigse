import type { ReactElement } from "react"

import { ConfirmRemoveDialog } from "@/components/confirm-remove-button"
import { useNotify } from "@/components/notice/notice-context"

import { useDeleteMenu } from "@/features/administration/roles-menus/api/mutations/delete-menu"
import type { MenuNode } from "@/features/administration/roles-menus/api/types/role-menu"

interface DialogDeleteMenuProps {
  menu: MenuNode
  /** Cuántos menús cuelgan de este, para avisarlo antes de borrar. */
  childrenCount: number
  trigger: ReactElement
}

/**
 * Confirmación para borrar un menú. El botón que abre el diálogo lo provee
 * el padre (`menu-transfer.tsx`) porque ahí vive dentro de un `<ContextMenu>`
 * propio — el componente solo se encarga del diálogo.
 */
export function DialogDeleteMenu({ menu, childrenCount, trigger }: DialogDeleteMenuProps) {
  const { notify } = useNotify()

  const deleteMenu = useDeleteMenu({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return false
        }
        notify("El menú se eliminó correctamente.")
      },
    },
  })

  return (
    <ConfirmRemoveDialog
      title="Eliminar menú"
      description={
        <>
          Se eliminará permanentemente «{menu.name}»
          {childrenCount > 0 && ` y los ${childrenCount} menús que cuelgan de él`} para todos los
          roles. Esta acción no se puede deshacer.
        </>
      }
      onConfirm={() => deleteMenu.mutateAsync({ id: menu.id })}
      trigger={trigger}
    />
  )
}
