import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"

import { documentDeadlineQueryKey } from "@/features/document-management/api/query/use-document-deadline"

interface DeleteDocumentDeadlineExceptionResult {
  establecimientoId: number
}

/** `PATCH /pigse/documentos/fecha-limite/excepciones/:ESTABLECIMIENTO`
 *  (V522) — saca la excepción de un establecimiento; vuelve a regirse por
 *  la fecha global. Solo Administrador/Secretaria Territorial. */
async function deleteDocumentDeadlineException(
  establecimientoId: number,
): Promise<DeleteDocumentDeadlineExceptionResult> {
  const path = apiPath(
    `/documents/deadline/exceptions/${establecimientoId}`,
    `/documentos/fecha-limite/excepciones/${establecimientoId}`,
  )
  const response = await api.patch<
    DeleteDocumentDeadlineExceptionResult | RowsEnvelope<DeleteDocumentDeadlineExceptionResult>
  >(path)
  return unwrapRow(response)
}

interface UseDeleteDocumentDeadlineExceptionOptions {
  mutationConfig?: MutationConfig<typeof deleteDocumentDeadlineException>
}

export function useDeleteDocumentDeadlineException({
  mutationConfig,
}: UseDeleteDocumentDeadlineExceptionOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteDocumentDeadlineException,
    ...mutationConfig,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: documentDeadlineQueryKey })
      await mutationConfig?.onSuccess?.(...args)
    },
  })
}
