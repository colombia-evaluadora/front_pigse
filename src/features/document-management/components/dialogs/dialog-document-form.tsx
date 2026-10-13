import { useRef, useState } from "react"

import {
  ArrowCounterClockwiseIcon,
  CheckCircleFillIcon,
  CircleDashedIcon,
  FileTextIcon,
  FileUploadOutlinedIcon,
  PaperclipIcon,
  PencilIcon,
  SpinnerIcon,
  TrashIcon,
  WarningCircleIcon,
  XIcon,
} from "@/components/ui/icons"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FileUpload, FileUploadDropzone } from "@/components/ui/file-upload"
import { ConfirmDiscardDialog } from "@/components/confirm-discard-dialog"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { NoticeProvider, useNotify } from "@/components/notice/notice-context"

import { getErrorMessage } from "@/lib/api-client"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { cn } from "@/lib/utils"

import {
  uploadDocumentFile,
  useSaveDocumentAnnexes,
  type StagedDocumentFile,
} from "@/features/document-management/api/mutations/use-save-document"
import {
  documentCategoriesForType,
  documentCategoryDisplayName,
  documentTypeDisplayName,
  requiredDocumentCategoriesForType,
  type DocumentCategory,
  type DocumentCategoryCode,
  type DocumentType,
} from "@/features/document-management/api/types/document"
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_HINT,
  DOCUMENT_MAX_SIZE,
  formatFileSize,
  missingAnnexesMessage,
  validateDocumentFile,
} from "@/features/document-management/lib/document-file"

/** Tope de archivos NUEVOS de "Plan de estudios" por guardado (los vigentes no cuentan). */
const PLAN_ESTUDIOS_MAX_NEW = 10

type UploadStatus = "pending" | "uploading" | "done" | "error"

interface FileProgress {
  status: UploadStatus
  percent: number
  error?: string
}

type Phase = "idle" | "uploading" | "saving"

interface DocumentFormDialogProps {
  type: DocumentType
  /** Anexos vigentes (`fn_documento_categorias_listar`), incluidas las filas PENDIENTE. */
  categories: DocumentCategory[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Formulario de un documento completo (PEI/PEC/PMI/PFI): un bloque por anexo,
 * y "Guardar" solo se habilita cuando TODOS los obligatorios tienen archivo
 * (nuevo o vigente). No hay guardado por anexo suelto (pedido explícito): el
 * colegio adjunta todo y se envía junto.
 *
 * Guardar son dos pasos (ver `use-save-document.ts`): subir cada archivo nuevo
 * (con progreso por archivo) y después enlazar todo en UNA transacción. Si
 * falla una subida, el documento NO cambió: se dice qué archivo/anexo falló y
 * los que ya subieron se reutilizan al reintentar (no se vuelven a enviar).
 *
 * Editar un documento ya completo es lo mismo: reemplazar un anexo de archivo
 * único (el anterior pasa al historial) o sumar/quitar archivos de "Plan de
 * estudios". Un obligatorio nunca se puede dejar vacío — no hay botón de quitar
 * para él, solo de reemplazar; el opcional sí se puede quitar.
 */
export function DocumentFormDialog({
  type,
  categories,
  open,
  onOpenChange,
}: DocumentFormDialogProps) {
  const { notify } = useNotify()

  const [newFiles, setNewFiles] = useState<Partial<Record<DocumentCategoryCode, File[]>>>({})
  const [removed, setRemoved] = useState<ReadonlySet<number>>(new Set())
  const [rejections, setRejections] = useState<Partial<Record<DocumentCategoryCode, string>>>({})
  const [progress, setProgress] = useState<ReadonlyMap<File, FileProgress>>(new Map())
  const [phase, setPhase] = useState<Phase>("idle")
  const [saveError, setSaveError] = useState<{ id: number; message: string } | null>(null)
  const [confirmDiscardOpen, setConfirmDiscardOpen] = useState(false)
  // Archivos ya subidos (paso 1) en este formulario: un reintento no los
  // vuelve a mandar. Se pierde al cerrar — quedan sin enlazar en el backend.
  const stagedRef = useRef(new Map<File, StagedDocumentFile>())

  const save = useSaveDocumentAnnexes()

  const annexes = documentCategoriesForType(type)
  const required = requiredDocumentCategoriesForType(type)
  const busy = phase !== "idle"

  const existingFor = (categoria: DocumentCategoryCode) =>
    categories.filter((c) => c.categoria === categoria && c.archivoId != null)
  const newFor = (categoria: DocumentCategoryCode) => newFiles[categoria] ?? []

  /** Archivos que quedarán vigentes en el anexo después de guardar. */
  function remainingCount(categoria: DocumentCategoryCode): number {
    const nuevos = newFor(categoria).length
    if (categoria !== "PLAN_ESTUDIOS" && nuevos > 0) return nuevos
    const vigentes = existingFor(categoria).filter((c) => !removed.has(c.archivoId!)).length
    return vigentes + nuevos
  }

  const missing = required.filter((categoria) => remainingCount(categoria) === 0)
  const hasChanges = annexes.some((categoria) => newFor(categoria).length > 0) || removed.size > 0
  const canSave = missing.length === 0 && hasChanges && !busy

  function setProgressFor(file: File, next: FileProgress) {
    setProgress((prev) => new Map(prev).set(file, next))
  }

  function reset() {
    setNewFiles({})
    setRemoved(new Set())
    setRejections({})
    setProgress(new Map())
    setPhase("idle")
    setSaveError(null)
    stagedRef.current = new Map()
    save.reset()
  }

  function close() {
    onOpenChange(false)
    reset()
  }

  function handleOpenChange(next: boolean) {
    if (next) {
      onOpenChange(true)
      return
    }
    if (busy) return
    if (hasChanges) {
      setConfirmDiscardOpen(true)
      return
    }
    close()
  }

  function setFilesFor(categoria: DocumentCategoryCode, files: File[]) {
    setNewFiles((prev) => ({ ...prev, [categoria]: files }))
    setRejections((prev) => ({ ...prev, [categoria]: undefined }))
    setSaveError(null)
  }

  function toggleRemoved(archivoId: number) {
    setRemoved((prev) => {
      const next = new Set(prev)
      if (next.has(archivoId)) next.delete(archivoId)
      else next.add(archivoId)
      return next
    })
    setSaveError(null)
  }

  async function handleSave() {
    if (!canSave) return
    setSaveError(null)
    setPhase("uploading")

    const anexos: { categoria: DocumentCategoryCode; archivoId: number }[] = []
    for (const categoria of annexes) {
      for (const file of newFor(categoria)) {
        let staged = stagedRef.current.get(file)
        if (!staged) {
          setProgressFor(file, { status: "uploading", percent: 0 })
          try {
            staged = await uploadDocumentFile({
              type,
              categoria,
              file,
              onProgress: (percent) => setProgressFor(file, { status: "uploading", percent }),
            })
          } catch (error) {
            const message = getErrorMessage(error)
            setProgressFor(file, { status: "error", percent: 0, error: message })
            setSaveError({
              id: Date.now(),
              message:
                `No se pudo subir «${file.name}» (${documentCategoryDisplayName(categoria)}): ${message} ` +
                "El documento no se modificó. Corrija ese archivo y vuelva a guardar; los que ya se subieron no se envían de nuevo.",
            })
            setPhase("idle")
            return
          }
          stagedRef.current.set(file, staged)
        }
        setProgressFor(file, { status: "done", percent: 100 })
        anexos.push({ categoria, archivoId: staged.archivoId })
      }
    }

    setPhase("saving")
    save.mutate(
      { type, anexos, quitar: [...removed] },
      {
        onSuccess: () => {
          notify(SUCCESS_MESSAGES.document.uploaded)
          close()
        },
        onError: (error) => {
          setSaveError({
            id: Date.now(),
            message: `No se guardó el documento: ${getErrorMessage(error)} Ningún anexo se modificó.`,
          })
          setPhase("idle")
        },
      },
    )
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[90vh] flex-col gap-4 sm:max-w-3xl">
          {/* Solo para silenciar el toast global de axios mientras el formulario
              está abierto: los errores ya se muestran en el banner, por anexo. */}
          <NoticeProvider>
            <DialogHeader>
              <DialogTitle>{documentTypeDisplayName(type)}</DialogTitle>
              <DialogDescription>
                Adjunte un archivo por anexo. Solo podrá guardar cuando todos los anexos
                obligatorios tengan archivo; el documento se guarda completo, no por anexo.
              </DialogDescription>
            </DialogHeader>

            <NoticeBanner notice={saveError} onClose={() => setSaveError(null)} variant="error" />

            <ul className="-mx-1 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-1">
              {annexes.map((categoria) => (
                <AnnexBlock
                  key={categoria}
                  categoria={categoria}
                  isRequired={required.includes(categoria)}
                  existing={existingFor(categoria)}
                  newFiles={newFor(categoria)}
                  removed={removed}
                  covered={remainingCount(categoria) > 0}
                  rejection={rejections[categoria]}
                  progress={progress}
                  disabled={busy}
                  onFilesChange={(files) => setFilesFor(categoria, files)}
                  onReject={(reason) => setRejections((prev) => ({ ...prev, [categoria]: reason }))}
                  onToggleRemoved={toggleRemoved}
                />
              ))}
            </ul>

            <DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p
                role="status"
                className={cn(
                  "m-0! flex items-center gap-1.5 text-xs",
                  missing.length > 0 ? "text-orange" : "text-muted-foreground",
                )}
              >
                {missing.length > 0 ? (
                  <>
                    <WarningCircleIcon className="size-4 shrink-0" />
                    {missingAnnexesMessage(missing)}
                  </>
                ) : phase === "uploading" ? (
                  "Subiendo archivos…"
                ) : phase === "saving" ? (
                  "Guardando documento…"
                ) : hasChanges ? (
                  <>
                    <CheckCircleFillIcon className="size-4 shrink-0 text-green" />
                    Todos los anexos obligatorios tienen archivo.
                  </>
                ) : (
                  "No hay cambios para guardar."
                )}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  variant="ghost"
                  disabled={busy}
                  onClick={() => handleOpenChange(false)}
                >
                  <XIcon data-icon="inline-start" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  type="button"
                  color="primary"
                  disabled={!canSave}
                  aria-busy={busy}
                  onClick={handleSave}
                >
                  {busy ? (
                    <SpinnerIcon data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <FileUploadOutlinedIcon data-icon="inline-start" />
                  )}
                  Guardar documento
                </Button>
              </div>
            </DialogFooter>
          </NoticeProvider>
        </DialogContent>
      </Dialog>

      <ConfirmDiscardDialog
        open={confirmDiscardOpen}
        onOpenChange={setConfirmDiscardOpen}
        onConfirm={() => {
          setConfirmDiscardOpen(false)
          close()
        }}
      />
    </>
  )
}

interface AnnexBlockProps {
  categoria: DocumentCategoryCode
  isRequired: boolean
  existing: DocumentCategory[]
  newFiles: File[]
  removed: ReadonlySet<number>
  covered: boolean
  rejection: string | undefined
  progress: ReadonlyMap<File, FileProgress>
  disabled: boolean
  onFilesChange: (files: File[]) => void
  onReject: (reason: string) => void
  onToggleRemoved: (archivoId: number) => void
}

function AnnexBlock({
  categoria,
  isRequired,
  existing,
  newFiles,
  removed,
  covered,
  rejection,
  progress,
  disabled,
  onFilesChange,
  onReject,
  onToggleRemoved,
}: AnnexBlockProps) {
  const multiple = categoria === "PLAN_ESTUDIOS"
  const replacing = !multiple && newFiles.length > 0
  // Plan de estudios: un vigente se puede quitar mientras quede otro archivo
  // (vigente o nuevo). Archivo único: solo el anexo opcional se quita; un
  // obligatorio se reemplaza, nunca se deja vacío.
  const keptExisting = existing.filter((c) => !removed.has(c.archivoId!)).length
  const canRemoveExisting = (archivoId: number) => {
    if (!multiple) return !isRequired
    if (removed.has(archivoId)) return true
    return !isRequired || keptExisting - 1 + newFiles.length > 0
  }
  const showDropzone = multiple ? newFiles.length < PLAN_ESTUDIOS_MAX_NEW : newFiles.length === 0
  const name = documentCategoryDisplayName(categoria).replace(/ \(opcional\)$/, "")

  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-3",
        isRequired && !covered ? "border-orange-stroke bg-orange-22/40" : "border-border",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {covered ? (
          <CheckCircleFillIcon className="size-5 shrink-0 text-green" aria-hidden />
        ) : (
          <CircleDashedIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <span className="font-medium">{name}</span>
        <Badge variant="soft" color={isRequired ? "warning" : "neutral"}>
          {isRequired ? "Obligatorio" : "Opcional"}
        </Badge>
        {multiple && <span className="text-xs text-muted-foreground">Admite varios archivos</span>}
      </div>

      {existing.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {existing.map((file) => {
            const isRemoved = removed.has(file.archivoId!)
            const superseded = replacing || isRemoved
            return (
              <li key={file.archivoId} className="flex items-center gap-2 text-sm">
                <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate",
                    superseded && "text-muted-foreground line-through",
                  )}
                >
                  {file.fileName}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {isRemoved ? "Se quitará" : replacing ? "Se reemplazará" : "Vigente"}
                  {!superseded && file.sizeBytes != null
                    ? ` · ${formatFileSize(file.sizeBytes)}`
                    : ""}
                </span>
                {canRemoveExisting(file.archivoId!) && (
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    type="button"
                    disabled={disabled}
                    aria-label={
                      isRemoved ? `Conservar ${file.fileName}` : `Quitar ${file.fileName}`
                    }
                    onClick={() => onToggleRemoved(file.archivoId!)}
                  >
                    {isRemoved ? <ArrowCounterClockwiseIcon /> : <TrashIcon />}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {newFiles.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {newFiles.map((file, index) => {
            const state = progress.get(file)
            return (
              <li key={`${file.name}-${index}`} className="flex flex-col gap-1 text-sm">
                <div className="flex items-center gap-2">
                  <PaperclipIcon className="size-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {state?.status === "done"
                      ? "Subido"
                      : state?.status === "uploading"
                        ? `Subiendo ${state.percent}%`
                        : state?.status === "error"
                          ? "Error"
                          : `Nuevo · ${formatFileSize(file.size)}`}
                  </span>
                  <Button
                    variant="ghost"
                    color="neutral"
                    size="icon-sm"
                    type="button"
                    disabled={disabled}
                    aria-label={`Quitar ${file.name}`}
                    onClick={() => onFilesChange(newFiles.filter((f) => f !== file))}
                  >
                    <XIcon />
                  </Button>
                </div>
                {state && state.status !== "pending" && (
                  <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div
                      className={cn(
                        "h-full transition-[width]",
                        state.status === "error"
                          ? "w-full bg-red"
                          : state.status === "done"
                            ? "bg-green"
                            : "bg-primary",
                      )}
                      style={state.status === "error" ? undefined : { width: `${state.percent}%` }}
                    />
                  </div>
                )}
                {state?.status === "error" && state.error && (
                  <p role="alert" className="m-0! text-xs text-red">
                    {state.error}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {showDropzone && (
        <FileUpload
          value={newFiles}
          onValueChange={onFilesChange}
          onFileReject={(_file, reason) => onReject(reason)}
          onFileValidate={validateDocumentFile}
          accept={DOCUMENT_ACCEPT}
          maxSize={DOCUMENT_MAX_SIZE}
          maxFiles={multiple ? PLAN_ESTUDIOS_MAX_NEW : 1}
          multiple={multiple}
          invalid={Boolean(rejection)}
          disabled={disabled}
        >
          <FileUploadDropzone className="flex-row gap-2 py-3">
            {existing.length > 0 && !multiple ? (
              <PencilIcon className="size-5 shrink-0 text-muted-foreground" />
            ) : (
              <PaperclipIcon className="size-5 shrink-0 text-muted-foreground" />
            )}
            <div className="flex flex-col text-left">
              <p className="m-0! text-xs leading-snug font-semibold">
                {existing.length > 0 && !multiple
                  ? "Reemplazar archivo: arrastre o "
                  : multiple && existing.length + newFiles.length > 0
                    ? "Agregar otro archivo: arrastre o "
                    : "Arrastre y suelte o "}
                <span className="text-primary">elija un archivo</span>
              </p>
              <p className="m-0! text-[11px] leading-snug text-muted-foreground">{DOCUMENT_HINT}</p>
            </div>
          </FileUploadDropzone>
        </FileUpload>
      )}

      {rejection && (
        <p role="alert" className="m-0! flex items-center gap-1 text-xs text-red">
          <WarningCircleIcon className="size-3.5 shrink-0" />
          {rejection}
        </p>
      )}
    </li>
  )
}
