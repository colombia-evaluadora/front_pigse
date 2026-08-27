import { FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useNotify } from "@/components/notice/notice-context"

import { ExportDialog } from "@/features/_shared/dialogs/export-dialog"
import { useExportSelected } from "@/features/establishment/employees/api/mutations/use-export-selected"

interface ExportSelectedEmployeesDialogProps {
  selectedIds: number[]
  resetSelection: () => void
}

/**
 * Diálogo de exportación para los funcionarios seleccionados. Después del
 * export exitoso resetea la selección. UI vive en `ExportDialog`.
 */
export function ExportSelectedEmployeesDialog({
  selectedIds,
  resetSelection,
}: ExportSelectedEmployeesDialogProps) {
  const { notify } = useNotify()
  const count = selectedIds.length

  const exportSelected = useExportSelected({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
        } else {
          notify(result.message)
          resetSelection()
        }
      },
    },
  })

  return (
    <ExportDialog
      description={`Elige un formato para exportar ${count} funcionario(s) seleccionado(s).`}
      trigger={
        <Button
          variant="outline"
          color="muted"
          size="sm"
          aria-label={`Exportar ${count} funcionarios seleccionados`}
        >
          <FileDownloadOutlinedIcon data-icon="inline-start" />
          <span className="tabular-nums">({count})</span>
        </Button>
      }
      onExport={async (format) => {
        await exportSelected.mutateAsync({ ids: selectedIds, format })
      }}
    />
  )
}
