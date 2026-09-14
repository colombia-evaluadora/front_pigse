import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"

import { useDelete } from "@/features/establishment/institution/api/mutations/use-delete"
import type { Establishment } from "@/features/establishment/institution/api/types/establishment"
import { establishmentsRoute } from "@/router"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface DeleteEstablishmentDialogProps {
  establishment: Establishment
}

/**
 * Diálogo unificado de borrado para establecimientos. En `onSuccess`
 * además resetea la paginación vía `establishmentsRoute.useNavigate()`
 * — mismo comportamiento que tenía antes de la unificación.
 */
export function DeleteEstablishmentDialog({ establishment }: DeleteEstablishmentDialogProps) {
  const { notify } = useNotify()
  const navigate = establishmentsRoute.useNavigate()
  const { puedeEliminar } = useMenuPermission("ESTABLECIMIENTO")

  const deleteMutation = useDelete({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return false
        }
        notify(SUCCESS_MESSAGES.establishment.deleted)
        navigate({
          search: (prev) => ({ ...prev, page: 0 }),
          replace: true,
        })
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  if (!puedeEliminar) return null

  return (
    <ConfirmRemoveButton
      label={`Eliminar ${establishment.name}`}
      title="Eliminar"
      description={
        <>
          Se eliminará permanentemente el establecimiento educativo {establishment.name}. Esta
          acción no se puede deshacer.
        </>
      }
      onConfirm={() => deleteMutation.mutateAsync(establishment.id)}
    />
  )
}
