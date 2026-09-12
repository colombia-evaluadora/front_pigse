import { useState } from "react"

import {
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  FileXlsIcon,
  SpinnerIcon,
} from "@/components/ui/icons"

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

import { useExportTableOperations } from "@/features/administration/audits/api/mutations/export-table-operations"
import type { ExportFormat } from "@/features/administration/audits/api/types/audit"
import type { TableOperationsQueryRequest } from "@/features/administration/audits/api/types/audit-table"
import { useNotify } from "@/components/notice/notice-context"

interface ExportTableOperationsDialogProps {
  tableSlug: string
  filters: TableOperationsQueryRequest["filters"]
}

export function ExportTableOperationsDialog({
  tableSlug,
  filters,
}: ExportTableOperationsDialogProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)

  const exportAll = useExportTableOperations({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        setOpen(false)
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportAll.mutate({ tableSlug, filters, format })
  }

  // Los dos botones comparten la misma mutación, así que `isPending` sola no
  // distingue cuál se pulsó. `variables` guarda el input en vuelo — con eso
  // el spinner sale solo en el botón que disparó la exportación.
  const pendingFormat = exportAll.isPending ? exportAll.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button color="primary" size="sm" aria-label="Exportar operaciones filtradas" />}
      >
        <FileDownloadOutlinedIcon data-icon="inline-start" />
        <span className="sr-only md:not-sr-only">Exportar</span>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar todas las operaciones que coincidan con los filtros
            activos.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-between">
          <DialogClose render={<Button size="sm" type="button" variant="ghost" />}>
            Cancelar
          </DialogClose>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              size="sm"
              type="button"
              variant="outline"
              disabled={exportAll.isPending}
              aria-busy={pendingFormat === "excel"}
              onClick={() => handleExport("excel")}
            >
              {pendingFormat === "excel" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FileXlsIcon data-icon="inline-start" />
              )}
              Excel
            </Button>
            <Button
              size="sm"
              type="button"
              color="primary"
              disabled={exportAll.isPending}
              aria-busy={pendingFormat === "pdf"}
              onClick={() => handleExport("pdf")}
            >
              {pendingFormat === "pdf" ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FilePdfIcon data-icon="inline-start" />
              )}
              PDF
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
