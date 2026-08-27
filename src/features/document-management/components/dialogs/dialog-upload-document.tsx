import { useState } from "react"

import {
  FilePdfIcon,
  PaperclipIcon,
  PlusIcon,
  SpinnerIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
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
import { Label } from "@/components/ui/label"
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload"

import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { useNotify } from "@/components/notice/notice-context"

import {
  useUploadDocument,
  toUploadDocumentParams,
} from "@/features/document-management/api/mutations/use-upload-document"
import type { Document } from "@/features/document-management/api/types/document"

/**
 * MIME types aceptados para los documentos institucionales. La lista es
 * la que define el backend (`file-service` valida el `param_types`):
 * PDF es el formato canónico, pero también se admiten Word y Excel porque
 * muchos EE todavía los editan en esos formatos antes de exportar a PDF.
 */
const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const

const DOCUMENT_ACCEPT = DOCUMENT_MIME_TYPES.join(",")
/** 25 MB — más que suficiente para un PEI/PMI con anexos; el gateway corta antes. */
const DOCUMENT_MAX_SIZE = 25 * 1024 * 1024

const TYPE_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
}

/** Texto del dropzone: los formatos aceptados y el tope de peso. */
const DOCUMENT_HINT = (() => {
  const labels = DOCUMENT_MIME_TYPES.map((type) => TYPE_LABEL[type] ?? type).join(", ")
  return `${labels} · Máximo 25 MB`
})()

/**
 * Validación sincronizada con el `accept`/`maxSize` del dropzone: si cambia
 * alguno de los dos de arriba, hay que cambiarlo acá también. Es lo que
 * decide el mensaje que ve el usuario al soltar el archivo y lo que
 * finalmente frena el submit.
 */
function validateDocumentFile(file: File): string | null {
  if (file.size === 0) return "El archivo está vacío."
  if (file.size > DOCUMENT_MAX_SIZE) return "El archivo supera el tamaño máximo permitido (25 MB)."
  if (!DOCUMENT_MIME_TYPES.includes(file.type as (typeof DOCUMENT_MIME_TYPES)[number])) {
    return "Formato no permitido. Usa PDF, Word o Excel."
  }
  return null
}

interface UploadDocumentDialogProps {
  document: Document
  /**
   * Variante del trigger:
   * - `button` (default): botón completo "Subir".
   * - `icon`: solo ícono, para reuso en menús de fila.
   */
  triggerVariant?: "button" | "icon"
  /** Etiqueta del trigger cuando es `button`. */
  triggerLabel?: React.ReactNode
}

/**
 * Diálogo modal para cargar (o reemplazar) la versión vigente de un
 * documento institucional. Sigue el patrón del `ImageUploadField`/`Dialog`:
 * trigger configurable, dropzone con drag-and-drop, validación sincronizada
 * con el `accept` del input y aviso inline si el archivo soltado no pasa
 * las reglas.
 *
 * El archivo viaja por multipart/form-data al endpoint
 * `/api/documents/upload`, que es el que `file-service` proxy-enruta para
 * guardar el binario en S3 y registrarlo en `TARCHIVO` antes de pasar al
 * query-service.
 */
export function UploadDocumentDialog({
  document,
  triggerVariant = "button",
  triggerLabel,
}: UploadDocumentDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [rejection, setRejection] = useState<string | null>(null)

  const { notify } = useNotify()
  const upload = useUploadDocument({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.document.uploaded)
        handleOpenChange(false)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) return
    upload.mutate(toUploadDocumentParams(document.type, file))
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      // Reset al cerrar: el archivo no se queda pegado para la próxima
      // apertura y el mensaje de rechazo no sobrevive.
      setFile(null)
      setRejection(null)
      upload.reset()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          triggerVariant === "icon" ? (
            <Button
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label={`Cargar ${document.typeName}`}
            >
              <PlusIcon />
            </Button>
          ) : (
            <Button variant="fill" color="primary" size="sm" type="button">
              <PlusIcon data-icon="inline-start" />
              {triggerLabel ?? "Subir"}
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cargar documento</DialogTitle>
          <DialogDescription>
            Adjunte la versión vigente del {document.typeName.toLowerCase()}. El archivo anterior,
            si lo hay, pasará al historial de versiones anteriores.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="upload-document-file">Archivo</Label>
            <FileUpload
              value={file ? [file] : []}
              onValueChange={(files) => {
                const next = files[0] ?? null
                setFile(next)
                if (next) setRejection(null)
              }}
              onFileReject={(_file, reason) => setRejection(reason)}
              onFileValidate={validateDocumentFile}
              accept={DOCUMENT_ACCEPT}
              maxSize={DOCUMENT_MAX_SIZE}
              maxFiles={1}
              invalid={Boolean(rejection)}
              disabled={upload.isPending}
            >
              {file ? (
                <FileUploadList>
                  <FileUploadItem value={file}>
                    <FileUploadItemPreview />
                    <FileUploadItemMetadata size="sm" />
                    <FileUploadItemDelete disabled={upload.isPending} aria-label="Quitar archivo">
                      <TrashIcon />
                    </FileUploadItemDelete>
                  </FileUploadItem>
                </FileUploadList>
              ) : (
                <FileUploadDropzone className="gap-1">
                  <PaperclipIcon className="size-6 shrink-0 text-muted-foreground" />
                  <p className="m-0! text-xs leading-snug font-semibold text-balance">
                    Arrastre y suelte o <span className="text-primary">elija un archivo</span>
                  </p>
                  <p className="m-0! text-[11px] leading-snug text-balance text-muted-foreground">
                    {DOCUMENT_HINT}
                  </p>
                </FileUploadDropzone>
              )}
            </FileUpload>

            {rejection ? (
              <p role="alert" className="m-0! flex items-center gap-1 text-xs text-red">
                <WarningCircleIcon className="size-3.5 shrink-0" />
                {rejection}
              </p>
            ) : null}
          </div>

          {/* Referencia visual del archivo actualmente vigente (si lo hay),
              para que el usuario sepa qué va a reemplazar antes de confirmar. */}
          {document.fileName ? (
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm">
              <FilePdfIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="m-0! font-medium">Versión vigente actual</p>
                <p className="m-0! truncate text-xs text-muted-foreground">{document.fileName}</p>
              </div>
            </div>
          ) : null}

          <DialogFooter className="sm:justify-between">
            <DialogClose
              render={
                <Button size="sm" type="button" variant="ghost" disabled={upload.isPending} />
              }
            >
              <XIcon data-icon="inline-start" />
              Cancelar
            </DialogClose>
            <Button
              size="sm"
              type="submit"
              color="primary"
              disabled={!file || upload.isPending}
              aria-busy={upload.isPending}
            >
              {upload.isPending ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <PaperclipIcon data-icon="inline-start" />
              )}
              Cargar documento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
