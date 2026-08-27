import { FileDownloadOutlinedIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { useNotify } from "@/components/notice/notice-context"

import { ExportDialog } from "@/features/_shared/dialogs/export-dialog"
import { useExport } from "@/features/establishment/employees/api/mutations/use-export"
import type { EmployeesQueryRequest } from "@/features/establishment/employees/api/types/employee"

interface ExportEmployeesDialogProps {
  filters: EmployeesQueryRequest["filters"]
}

/**
 * Diálogo de exportación para todos los funcionarios filtrados.
 * La UI vive en `ExportDialog` — este componente solo arma el `mutate`
 * y maneja notificaciones.
 */
export function ExportEmployeesDialog({ filters }: ExportEmployeesDialogProps) {
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
      description="Elige un formato para exportar todos los funcionarios que coincidan con los filtros activos."
      trigger={
        <Button
          variant="outline"
          color="muted"
          size="icon-sm"
          aria-label="Exportar funcionarios filtrados"
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
