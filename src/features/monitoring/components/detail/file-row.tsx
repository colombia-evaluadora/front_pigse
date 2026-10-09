import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { EyeIcon, FileDownloadOutlinedIcon, SpinnerIcon } from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { paths } from "@/config/paths"
import { downloadArchivo } from "@/lib/files"
import { cn } from "@/lib/utils"

import { fileKindMeta, formatFileSize } from "@/features/files/lib/file-kind"
import type { ComplianceFile, DocumentType } from "@/features/monitoring/api/types/compliance"
import { formatDateTime, formatShortDate } from "@/features/monitoring/api/ui-mappings"

interface FileRowProps {
  file: ComplianceFile
  type: DocumentType
  establishmentId: number
  establishmentName: string
}

/**
 * Un archivo de un anexo: ícono por tipo, nombre, peso y fecha, y las dos
 * acciones. "Consultar" abre el visor de la app con ESTE archivo (y el EE,
 * para que el visor ofrezca saltar entre los demás archivos y volver acá);
 * en Word/Excel el visor explica que no hay vista previa y ofrece descargar.
 */
export function FileRow({ file, type, establishmentId, establishmentName }: FileRowProps) {
  const [descargando, setDescargando] = useState(false)
  const { notify } = useNotify()
  const meta = fileKindMeta(file.fileName)
  const name = file.fileName ?? `Archivo ${file.archivoId}`
  const downloadUrl = file.downloadUrl ?? `/api/files/download/${file.archivoId}`
  const details = [meta.label, formatFileSize(file.sizeBytes), formatShortDate(file.uploadedAt)]
    .filter(Boolean)
    .join(" · ")

  async function handleDownload() {
    setDescargando(true)
    try {
      await downloadArchivo(downloadUrl, name)
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo descargar el documento.", {
        variant: "error",
      })
    } finally {
      setDescargando(false)
    }
  }

  return (
    <li className="flex flex-col gap-3 rounded-md border border-border bg-background p-3 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <span
          className={cn("flex size-10 shrink-0 items-center justify-center rounded-md", meta.tone)}
        >
          <meta.Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="m-0! truncate text-sm font-medium" title={name}>
            {name}
          </p>
          <p className="m-0! text-xs text-muted-foreground">
            {file.uploadedAt ? (
              <time dateTime={file.uploadedAt} title={formatDateTime(file.uploadedAt)}>
                {details}
              </time>
            ) : (
              details
            )}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 self-end sm:self-auto">
        <Button
          variant="ghost"
          color="neutral"
          size="sm"
          aria-label={`Consultar ${name}`}
          render={
            <Link
              to={paths.app.visor.getHref(type)}
              search={{
                archivoId: file.archivoId,
                fileName: file.fileName ?? undefined,
                downloadUrl,
                establishmentName,
                establecimientoId: establishmentId,
                origen: "monitoreo",
              }}
            />
          }
          nativeButton={false}
        >
          <EyeIcon data-icon="inline-start" />
          Consultar
        </Button>
        <Button
          variant="outline"
          color="neutral"
          size="sm"
          type="button"
          aria-label={`Descargar ${name}`}
          disabled={descargando}
          onClick={handleDownload}
        >
          {descargando ? (
            <SpinnerIcon data-icon="inline-start" className="animate-spin" />
          ) : (
            <FileDownloadOutlinedIcon data-icon="inline-start" />
          )}
          Descargar
        </Button>
      </div>
    </li>
  )
}
