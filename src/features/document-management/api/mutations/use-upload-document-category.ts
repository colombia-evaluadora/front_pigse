import { useMutation, useQueryClient } from "@tanstack/react-query"

import { apiPath } from "@/lib/api-paths"
import { postMultipart } from "@/lib/files"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"

import { documentsQueryKey } from "@/features/document-management/api/query/use-documents"
import { documentCategoriesQueryKey } from "@/features/document-management/api/query/use-document-categories"
import type {
  DocumentCategoryCode,
  DocumentCategoryMutationResult,
  DocumentType,
} from "@/features/document-management/api/types/document"

/**
 * `POST /pigse/documentos/upload` (multipart/form-data) — mismo endpoint que
 * `use-upload-document.ts`, pero para un anexo de PEI/PEC (V512): suma
 * `BODY.CATEGORIA`, que `fn_documento_guardar` exige cuando `TIPO` es PEI o
 * PEC (ver la migración V512 — rechaza con 400/22023 si falta).
 *
 * Roles autorizados en la BD: los mismos que el upload de siempre —
 * `PIGSE-ADMINISTRADOR`, `PIGSE-SECRETARIO`, `PIGSE-RESPONSABLE_CARGUE`.
 */
async function uploadDocumentCategory(params: {
  type: DocumentType
  categoria: DocumentCategoryCode
  file: File
}): Promise<DocumentCategoryMutationResult> {
  const path = apiPath("/documents/upload", "/documentos/upload")
  const response = await postMultipart<
    DocumentCategoryMutationResult | RowsEnvelope<DocumentCategoryMutationResult>
  >(path, { TIPO: params.type, CATEGORIA: params.categoria }, { ARCHIVO: params.file })
  return unwrapRow(response)
}

interface UseUploadDocumentCategoryOptions {
  mutationConfig?: MutationConfig<typeof uploadDocumentCategory>
}

export function useUploadDocumentCategory({ mutationConfig }: UseUploadDocumentCategoryOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadDocumentCategory,
    ...mutationConfig,
    // Se invalidan las DOS listas: la de categorías (la fila que acaba de
    // cambiar) y la de tipos (PEI/PEC recalculan su "completedCategories" /
    // status a partir de esto). Mismo criterio "await" que el resto de las
    // mutaciones de este módulo: el diálogo espera a que ambas listas estén
    // frescas antes de cerrarse.
    onSuccess: async (...args) => {
      const [, variables] = args
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: documentCategoriesQueryKey(variables.type) }),
        queryClient.invalidateQueries({ queryKey: documentsQueryKey }),
      ])
      await mutationConfig?.onSuccess?.(...args)
    },
  })
}

export function toUploadDocumentCategoryParams(
  type: DocumentType,
  categoria: DocumentCategoryCode,
  file: File | null,
): { type: DocumentType; categoria: DocumentCategoryCode; file: File } {
  if (!file) {
    throw new Error("Se requiere un archivo para cargar el anexo.")
  }
  return { type, categoria, file }
}
