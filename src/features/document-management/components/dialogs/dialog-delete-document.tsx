import { ConfirmRemoveDialog } from "@/components/confirm-remove-button"
import { Button } from "@/components/ui/button"
import { TrashIcon } from "@/components/ui/icons"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"

import { useDeleteCurrentDocumentVersion } from "@/features/document-management/api/mutations/use-delete-document"
import type { Document } from "@/features/document-management/api/types/document"

interface DeleteDocumentDialogProps {
  document: Document
}

/**
 * Confirmación para eliminar la versión vigente de un documento. El archivo
 * no se borra del historial: pasa a "versiones anteriores" y el estado del
 * documento vuelve a PENDIENTE hasta que se suba uno nuevo. El trigger es un
 * botón con texto (no el papelera-inline) — por eso no usa
 * `ConfirmRemoveButton` y llama a `ConfirmRemoveDialog` directo con el
 * trigger armado.
 */
export function DeleteDocumentDialog({ document }: DeleteDocumentDialogProps) {
  const { notify } = useNotify()

  const deleteMutation = useDeleteCurrentDocumentVersion({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return false
        }
        notify(SUCCESS_MESSAGES.document.deleted)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <ConfirmRemoveDialog
      title="Eliminar documento"
      description={
        <>
          Se eliminará la versión vigente del {document.typeName.toLowerCase()} (
          <strong>{document.fileName}</strong>). El archivo pasará al historial de versiones
          anteriores y el estado volverá a Pendiente hasta que se suba uno nuevo. Esta acción no se
          puede deshacer desde esta pantalla.
        </>
      }
      confirmLabel="Sí, eliminar"
      hidden={!document.fileName}
      onConfirm={() => deleteMutation.mutateAsync(document.type)}
      trigger={
        <Button
          type="button"
          variant="outline"
          color="neutral"
          size="sm"
          aria-label={`Eliminar ${document.typeName}`}
        >
          <TrashIcon data-icon="inline-start" />
          Eliminar
        </Button>
      }
    />
  )
}
