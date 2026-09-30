import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"

import { documentDeadlineQueryKey } from "@/features/document-management/api/query/use-document-deadline"
import type { DocumentDeadlineException } from "@/features/document-management/api/types/document-deadline"

/** `PUT /pigse/documentos/fecha-limite/excepciones/:ESTABLECIMIENTO`
 *  (V522) — fija la fecha límite PROPIA de un establecimiento (reemplaza
 *  la global para él, no la suma). Solo Administrador/Secretaria
 *  Territorial. */
async function saveDocumentDeadlineException(params: {
  establecimientoId: number
  fechaLimite: string
}): Promise<DocumentDeadlineException> {
  const path = apiPath(
    `/documents/deadline/exceptions/${params.establecimientoId}`,
    `/documentos/fecha-limite/excepciones/${params.establecimientoId}`,
  )
  const response = await api.put<DocumentDeadlineException | RowsEnvelope<DocumentDeadlineException>>(
    path,
    { FECHALIMITE: params.fechaLimite },
  )
  return unwrapRow(response)
}

interface UseSaveDocumentDeadlineExceptionOptions {
  mutationConfig?: MutationConfig<typeof saveDocumentDeadlineException>
}

export function useSaveDocumentDeadlineException({
  mutationConfig,
}: UseSaveDocumentDeadlineExceptionOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveDocumentDeadlineException,
    ...mutationConfig,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: documentDeadlineQueryKey })
      await mutationConfig?.onSuccess?.(...args)
    },
  })
}
