import type { ComponentType } from "react"

import { FilePdfIcon, FileTextIcon, FileXlsIcon, ImageIcon } from "@/components/ui/icons"
import { formatBytes } from "@/lib/image-file"

/**
 * Clase de archivo según la extensión del nombre. Los documentos
 * institucionales llegan en PDF, Word o Excel (PMI/PFI suelen ser hojas de
 * cálculo): solo el PDF se puede previsualizar en la app (pdf.js), el resto
 * se ofrece para descarga.
 */
export type FileKind = "pdf" | "word" | "excel" | "image" | "other"

export function fileKindOf(fileName: string | null | undefined): FileKind {
  const extension = /\.([a-z0-9]+)$/i.exec(fileName ?? "")?.[1]?.toLowerCase()
  switch (extension) {
    case "pdf":
      return "pdf"
    case "doc":
    case "docx":
    case "odt":
    case "rtf":
      return "word"
    case "xls":
    case "xlsx":
    case "ods":
    case "csv":
      return "excel"
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
      return "image"
    default:
      return "other"
  }
}

/** Sin nombre no se puede saber: se asume PDF (es lo que exige la carga). */
export function isPreviewable(fileName: string | null | undefined): boolean {
  return !fileName || fileKindOf(fileName) === "pdf"
}

interface FileKindMeta {
  label: string
  Icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>
  /** Clases literales (Tailwind no ve strings armados). */
  tone: string
}

const FILE_KIND_META: Record<FileKind, FileKindMeta> = {
  pdf: { label: "PDF", Icon: FilePdfIcon, tone: "bg-red-22 text-red" },
  word: { label: "Word", Icon: FileTextIcon, tone: "bg-blue-22 text-blue" },
  excel: { label: "Excel", Icon: FileXlsIcon, tone: "bg-green-22 text-green" },
  image: { label: "Imagen", Icon: ImageIcon, tone: "bg-purple-22 text-purple" },
  other: { label: "Archivo", Icon: FileTextIcon, tone: "bg-muted text-muted-foreground" },
}

export function fileKindMeta(fileName: string | null | undefined): FileKindMeta {
  return FILE_KIND_META[fileKindOf(fileName)]
}

/** "1,5 MB" / "320 KB"; vacío si no hay peso. */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes <= 0) return ""
  if (bytes < 1024) return `${bytes} B`
  return formatBytes(bytes)
}
