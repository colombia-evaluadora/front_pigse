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
 * `PATCH /pigse/documentos/:TIPO/categorias/:CATEGORIA` (V512) — baja
 * lógica de UN anexo puntual de PEI/PEC. Mismo criterio que
 * `use-delete-document.ts`: el archivo pasa al historial, el anexo vuelve
 * a PENDIENTE, nunca se borra.
 */
async function deleteDocumentCategory(params: {
  type: DocumentType
  categoria: DocumentCategoryCode
}): Promise<DocumentCategoryMutationResult> {
  const url = apiPath(
    `/documents/${params.type}/categories/${params.categoria}`,
    `/documentos/${params.type}/categorias/${params.categoria}`,
  )
  const response = await api.patch<
    DocumentCategoryMutationResult | RowsEnvelope<DocumentCategoryMutationResult>
  >(url)
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
