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

import { useExportSessionOperations } from "@/features/administration/audits/api/mutations/export-session-operations"
import type { ExportFormat } from "@/features/administration/audits/api/types/audit"
import { useNotify } from "@/components/notice/notice-context"

interface ExportSelectedSessionOperationsDialogProps {
  sessionId: string
  selectedIds: string[]
  resetSelection: () => void
}

export function ExportSelectedSessionOperationsDialog({
  sessionId,
  selectedIds,
  resetSelection,
}: ExportSelectedSessionOperationsDialogProps) {
  const { notify } = useNotify()
  const [open, setOpen] = useState(false)
  const count = selectedIds.length

  const exportSelected = useExportSessionOperations({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(result.message)
        setOpen(false)
        resetSelection()
      },
    },
  })

  function handleExport(format: ExportFormat) {
    exportSelected.mutate({ sessionId, ids: selectedIds, format })
  }

  // Los dos botones comparten la misma mutación, así que `isPending` sola no
  // distingue cuál se pulsó — antes salía el spinner en los dos a la vez.
  // `variables` guarda el input en vuelo, y con eso marcamos solo el botón
  // que disparó la exportación.
  const pendingFormat = exportSelected.isPending ? exportSelected.variables?.format : undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={<Button color="primary" size="sm" aria-label={`Exportar ${count} seleccionadas`} />}
      >
        <FileDownloadOutlinedIcon data-icon="inline-start" />
        <span aria-hidden="true" className="md:hidden">
          ({count})
        </span>
        <span className="sr-only md:not-sr-only">Exportar ({count})</span>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>
            Elige un formato para exportar {count} operación(es) seleccionada(s).
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
              disabled={exportSelected.isPending}
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
              disabled={exportSelected.isPending}
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
