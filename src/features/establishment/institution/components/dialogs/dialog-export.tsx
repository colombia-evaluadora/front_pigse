import { FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useNotify } from "@/components/notice/notice-context"

import { ExportDialog } from "@/features/_shared/dialogs/export-dialog"
import { useExport } from "@/features/establishment/institution/api/mutations/use-export"
import type { EstablishmentsQueryRequest } from "@/features/establishment/institution/api/types/establishment"

interface ExportEstablishmentsDialogProps {
  filters: EstablishmentsQueryRequest["filters"]
}

/**
 * Diálogo de exportación para todos los establecimientos que coincidan con
 * los filtros. La UI vive en `ExportDialog` — este componente solo le
 * pasa el `mutate({filters, format})` correcto y maneja las notificaciones.
 */
export function ExportEstablishmentsDialog({ filters }: ExportEstablishmentsDialogProps) {
  const { notify } = useNotify()
  const exportAll = useExport({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
        } else {
          notify(result.message)
        }
      },
    },
  })

  return (
    <ExportDialog
      description="Elige un formato para exportar todos los establecimientos que coincidan con los filtros activos."
      trigger={
        <Button
          variant="outline"
          color="muted"
          size="icon-sm"
          aria-label="Exportar establecimientos filtrados"
        >
          <FileDownloadOutlinedIcon />
        </Button>
      }
      onExport={async (format) => {
        await exportAll.mutateAsync({ filters, format })
      }}
    />
  )
}
