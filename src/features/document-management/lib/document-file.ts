import {
  documentCategoryDisplayName,
  type DocumentCategoryCode,
} from "@/features/document-management/api/types/document"

/**
 * Formatos y tope de los anexos de Gestión documental. El tope (25 MB) es el
 * `FILES_MAX_FILE_SIZE` de file-service: un archivo más grande lo rechaza el
 * backend antes de llegar a la base, así que se corta acá con un mensaje claro.
 */
export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const

export const DOCUMENT_ACCEPT = DOCUMENT_MIME_TYPES.join(",")
export const DOCUMENT_MAX_SIZE = 25 * 1024 * 1024

const TYPE_LABEL: Record<string, string> = {
  "application/pdf": "PDF",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/vnd.ms-excel": "XLS",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
}

export const DOCUMENT_HINT = `${DOCUMENT_MIME_TYPES.map((type) => TYPE_LABEL[type] ?? type).join(", ")} · Máximo 25 MB`

export function validateDocumentFile(file: File): string | null {
  if (file.size === 0) return "El archivo está vacío."
  if (file.size > DOCUMENT_MAX_SIZE) return "El archivo supera el tamaño máximo permitido (25 MB)."
  if (!DOCUMENT_MIME_TYPES.includes(file.type as (typeof DOCUMENT_MIME_TYPES)[number])) {
    return "Formato no permitido. Usa PDF, Word o Excel."
  }
  return null
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return ""
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Lista legible para "Faltan 2 anexos obligatorios: SIEE, Manual de convivencia." */
export function missingAnnexesMessage(missing: readonly DocumentCategoryCode[]): string {
  const names = missing.map((categoria) => documentCategoryDisplayName(categoria)).join(", ")
  return missing.length === 1
    ? `Falta 1 anexo obligatorio: ${names}.`
    : `Faltan ${missing.length} anexos obligatorios: ${names}.`
}
