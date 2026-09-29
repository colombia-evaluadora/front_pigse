import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
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
 * `PATCH /pigse/documentos/:TIPO/categorias/:CATEGORIA` (V512/V515) — baja
 * lógica de UN anexo puntual de PEI/PEC. Mismo criterio que
 * `use-delete-document.ts`: el archivo pasa al historial, nunca se borra.
 *
 * `archivoId` (V515): obligatorio para "Plan de estudios" — esa categoría
 * admite varios archivos a la vez, así que hay que decirle al backend CUÁL
 * de todos se da de baja (`fn_documento_eliminar` lo exige, rechaza con
 * 400/22023 si falta). Para las otras 4 categorías (un solo archivo cada
 * una) va `null` — el backend rechaza si viene un id ahí, porque no
 * corresponde.
 */
async function deleteDocumentCategory(params: {
  type: DocumentType
  categoria: DocumentCategoryCode
  archivoId?: number | null
}): Promise<DocumentCategoryMutationResult> {
  const url = apiPath(
    `/documents/${params.type}/categories/${params.categoria}`,
    `/documentos/${params.type}/categorias/${params.categoria}`,
  )
  const response = await api.patch<
    DocumentCategoryMutationResult | RowsEnvelope<DocumentCategoryMutationResult>
  >(url, { ARCHIVOID: params.archivoId ?? null })
  return unwrapRow(response)
}

interface UseDeleteDocumentCategoryOptions {
  mutationConfig?: MutationConfig<typeof deleteDocumentCategory>
}

export function useDeleteDocumentCategory({ mutationConfig }: UseDeleteDocumentCategoryOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDocumentCategory,
    ...mutationConfig,
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
