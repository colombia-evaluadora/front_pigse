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
  useUploadDocumentCategory,
  toUploadDocumentCategoryParams,
} from "@/features/document-management/api/mutations/use-upload-document-category"
import type { DocumentCategory } from "@/features/document-management/api/types/document"

/**
 * Mismos MIME/tope que `dialog-upload-document.tsx` — un anexo es el mismo
 * tipo de archivo que antes era el documento entero, solo que ahora hay 5
 * en vez de 1.
 */
const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const

const DOCUMENT_ACCEPT = DOCUMENT_MIME_TYPES.join(",")
const DOCUMENT_MAX_SIZE = 25 * 1024 * 1024

const TYPE_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
}

const DOCUMENT_HINT = (() => {
  const labels = DOCUMENT_MIME_TYPES.map((type) => TYPE_LABEL[type] ?? type).join(", ")
  return `${labels} · Máximo 25 MB`
})()

function validateDocumentFile(file: File): string | null {
  if (file.size === 0) return "El archivo está vacío."
  if (file.size > DOCUMENT_MAX_SIZE) return "El archivo supera el tamaño máximo permitido (25 MB)."
  if (!DOCUMENT_MIME_TYPES.includes(file.type as (typeof DOCUMENT_MIME_TYPES)[number])) {
    return "Formato no permitido. Usa PDF, Word o Excel."
  }
  return null
}

interface UploadDocumentCategoryDialogProps {
  category: DocumentCategory
  triggerVariant?: "button" | "icon"
  triggerLabel?: React.ReactNode
}

/**
 * Igual que `UploadDocumentDialog` (mismo dropzone, misma validación), pero
 * para un anexo de PEI/PEC (V512): manda `categoria` además de `tipo`. Se
 * duplica en vez de generalizar el diálogo de un solo archivo para no
 * arriesgar el flujo de PMI, que sigue siendo un solo archivo sin categoría.
 */
export function UploadDocumentCategoryDialog({
  category,
  triggerVariant = "button",
  triggerLabel,
}: UploadDocumentCategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [rejection, setRejection] = useState<string | null>(null)

  const { notify } = useNotify()
  const upload = useUploadDocumentCategory({
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
    upload.mutate(toUploadDocumentCategoryParams(category.type, category.categoria, file))
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
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
              aria-label={`Cargar ${category.categoriaName}`}
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
          <DialogTitle>Cargar anexo</DialogTitle>
          <DialogDescription>
            Adjunte la versión vigente de {category.categoriaName.toLowerCase()}. El archivo
            anterior, si lo hay, pasará al historial de versiones anteriores.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="upload-document-category-file">Archivo</Label>
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

          {category.fileName ? (
            <div className="flex items-start gap-3 rounded-md border border-border bg-muted/20 p-3 text-sm">
              <FilePdfIcon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="m-0! font-medium">Versión vigente actual</p>
                <p className="m-0! truncate text-xs text-muted-foreground">{category.fileName}</p>
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
              Cargar anexo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
