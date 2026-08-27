import { type ReactElement, type ReactNode, useState } from "react"

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
import { FilePdfIcon, FileXlsIcon, SpinnerIcon } from "@/components/ui/icons"

import type { ExportFormat } from "@/features/establishment/institution/api/types/export"

interface ExportDialogProps {
  /** Texto del cuerpo del diálogo. */
  description: ReactNode
  /** Trigger que abre el diálogo. Típicamente un `<Button>` con icono de descarga. */
  trigger: ReactElement
  /**
   * Función que arma y dispara la exportación. Se llama con el formato
   * elegido; el diálogo la `await`-ea y, si no falla, cierra el modal.
   * Adentro el caller hace lo suyo: `mutate`, notificación, reset de
   * selección, invalidación de cache…
   *
   * Si devuelve `Promise.reject(...)` o tira, el diálogo NO se cierra y
   * el caller maneja el toast/aviso. Mismo patrón que
   * `ConfirmRemoveDialog.onConfirm`.
   */
  onExport: (format: ExportFormat) => Promise<unknown>
}

/**
 * Diálogo unificado para elegir formato de exportación (Excel / PDF).
 *
 * Antes vivía cuatro veces con copy-pega: `dialog-export.tsx` y
 * `dialog-export-selected.tsx` para empleados e instituciones. Lo único que
 * cambia entre uno y otro es:
 *   - qué `onExport` hacer (filtros vs. IDs) — la recibe por prop
 *   - la descripción — la recibe por prop
 *   - el aspecto del trigger — la recibe por prop
 */
export function ExportDialog({ description, trigger, onExport }: ExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState<{ format: ExportFormat } | null>(null)

  async function handleExport(format: ExportFormat) {
    setPending({ format })
    try {
      await onExport(format)
      setOpen(false)
    } catch {
      // El caller ya notificó el error. Acá lo único que importa es no
      // cerrar el diálogo para que el usuario vea el resultado.
    } finally {
      setPending(null)
    }
  }

  const busy = pending !== null

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
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
              disabled={busy}
              aria-busy={pending?.format === "excel"}
              onClick={() => handleExport("excel")}
            >
              {pending?.format === "excel" ? (
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
              disabled={busy}
              aria-busy={pending?.format === "pdf"}
              onClick={() => handleExport("pdf")}
            >
              {pending?.format === "pdf" ? (
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
