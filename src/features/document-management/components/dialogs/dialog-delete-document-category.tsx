import { ConfirmRemoveDialog } from "@/components/confirm-remove-button"
import { Button } from "@/components/ui/button"
import { TrashIcon } from "@/components/ui/icons"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { useNotify } from "@/components/notice/notice-context"

import { useDeleteDocumentCategory } from "@/features/document-management/api/mutations/use-delete-document-category"
import type { DocumentCategory } from "@/features/document-management/api/types/document"

interface DeleteDocumentCategoryDialogProps {
  category: DocumentCategory
}

/** Igual que `DeleteDocumentDialog`, para un anexo de PEI/PEC (V512). */
export function DeleteDocumentCategoryDialog({ category }: DeleteDocumentCategoryDialogProps) {
  const { notify } = useNotify()

  const deleteMutation = useDeleteDocumentCategory({
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
      title="Eliminar anexo"
      description={
        <>
          Se eliminará la versión vigente de {category.categoriaName.toLowerCase()} (
          <strong>{category.fileName}</strong>). El archivo pasará al historial de versiones
          anteriores y el estado volverá a Pendiente hasta que se suba uno nuevo. Esta acción no se
          puede deshacer desde esta pantalla.
        </>
      }
      confirmLabel="Sí, eliminar"
      hidden={!category.fileName}
      onConfirm={() =>
        deleteMutation.mutateAsync({
          type: category.type,
          categoria: category.categoria,
          // "Plan de estudios" admite varios archivos (V515): hay que decir
          // cuál de todos se elimina. Las demás categorías van sin esto.
          archivoId: category.categoria === "PLAN_ESTUDIOS" ? category.archivoId : null,
        })
      }
      trigger={
        <Button
          type="button"
          variant="outline"
          color="neutral"
          size="sm"
          aria-label={`Eliminar ${category.categoriaName}`}
        >
          <TrashIcon data-icon="inline-start" />
          Eliminar
        </Button>
      }
    />
  )
}
