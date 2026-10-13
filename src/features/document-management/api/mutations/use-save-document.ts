import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { toMultipart } from "@/lib/files"
import { unwrapRow, unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"

import { documentsQueryKey } from "@/features/document-management/api/query/use-documents"
import { documentCategoriesQueryKey } from "@/features/document-management/api/query/use-document-categories"
import type {
  DocumentCategory,
  DocumentCategoryCode,
  DocumentType,
} from "@/features/document-management/api/types/document"

/** Archivo ya subido a file-service pero todavía SIN enlazar a ningún anexo. */
export interface StagedDocumentFile {
  archivoId: number
  fileName: string
  sizeBytes: number
}

/**
 * Paso 1 — `POST /files/pigse/documentos/archivos` (multipart, V555.5): sube
 * UN archivo de un anexo. `fn_documento_archivo_preparar` valida tipo/
 * categoría, fecha límite y modalidad del EE, pero NO lo enlaza: el documento
 * no cambia hasta el paso 2. Va un request por archivo (y no todo en un solo
 * multipart) porque file-service no admite varios archivos bajo un mismo campo
 * declarado (no existe `FILE[]`) y su tope por request es 30 MB: con cinco
 * anexos de hasta 25 MB cada uno no entraría. De paso da progreso por archivo.
 */
export async function uploadDocumentFile(params: {
  type: DocumentType
  categoria: DocumentCategoryCode
  file: File
  onProgress?: (percent: number) => void
}): Promise<StagedDocumentFile> {
  const path = apiPath("/documents/files", "/documentos/archivos")
  const response = await api.post<StagedDocumentFile | RowsEnvelope<StagedDocumentFile>>(
    `/files${path}`,
    toMultipart({ TIPO: params.type, CATEGORIA: params.categoria }, { ARCHIVO: params.file }),
    {
      onUploadProgress: (event) => {
        if (!params.onProgress || !event.total) return
        params.onProgress(Math.round((event.loaded / event.total) * 100))
      },
    },
  )
  return unwrapRow(response)
}

export interface SaveDocumentAnnexesParams {
  type: DocumentType
  /** Archivos nuevos (ya subidos en el paso 1) por anexo. */
  anexos: { categoria: DocumentCategoryCode; archivoId: number }[]
  /** `archivoId` vigentes que se dan de baja (Plan de estudios / anexo opcional). */
  quitar: number[]
}

/**
 * Paso 2 — `PUT /pigse/documentos/:TIPO/anexos` (V555.5): enlaza TODO de una
 * vez en una sola transacción (`fn_documento_guardar_lote`). Si al terminar
 * falta algún anexo obligatorio, el backend rechaza (23514) y no queda nada
 * escrito — el front ya lo impide, esto es la red de seguridad.
 */
async function saveDocumentAnnexes(params: SaveDocumentAnnexesParams): Promise<DocumentCategory[]> {
  const path = apiPath(`/documents/${params.type}/annexes`, `/documentos/${params.type}/anexos`)
  const response = await api.put<DocumentCategory[] | RowsEnvelope<DocumentCategory>>(path, {
    ANEXOS: params.anexos,
    QUITAR: params.quitar,
  })
  return unwrapRows(response)
}

interface UseSaveDocumentAnnexesOptions {
  mutationConfig?: MutationConfig<typeof saveDocumentAnnexes>
}

export function useSaveDocumentAnnexes({ mutationConfig }: UseSaveDocumentAnnexesOptions = {}) {
  const queryClient = useQueryClient()
  const { onSuccess, ...rest } = mutationConfig ?? {}

  return useMutation({
    mutationFn: saveDocumentAnnexes,
    ...rest,
    // Se invalidan las dos listas (anexos del tipo y avance por tipo) y se
    // espera a que estén frescas antes de cerrar el formulario.
    onSuccess: async (...args) => {
      const [, variables] = args
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentCategoriesQueryKey(variables.type) }),
        queryClient.invalidateQueries({ queryKey: documentsQueryKey }),
      ])
      await onSuccess?.(...args)
    },
  })
}
