import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"

import { useDelete } from "@/features/establishment/employees/api/mutations/use-delete"
import type { EmployeeListItem } from "@/features/establishment/employees/api/types/employee"

interface DeleteEmployeeDialogProps {
  employee: EmployeeListItem
}

/**
 * Diálogo unificado de borrado para funcionarios. El wrapper queda porque
 * la columna de la tabla espera un componente `DeleteEmployeeDialog`
 * dedicado — la lógica vive en `useDelete` y el aspecto en `ConfirmRemoveButton`.
 */
export function DeleteEmployeeDialog({ employee }: DeleteEmployeeDialogProps) {
  const { notify } = useNotify()

  const deleteMutation = useDelete({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return false
        }
        notify(SUCCESS_MESSAGES.employee.deleted)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <ConfirmRemoveButton
      label={`Eliminar ${employee.name}`}
      title="Eliminar"
      description={
        <>
          Se eliminará permanentemente al funcionario {employee.name}. Esta acción no se puede
          deshacer.
        </>
      }
      onConfirm={() => deleteMutation.mutateAsync(employee.id)}
    />
  )
}
