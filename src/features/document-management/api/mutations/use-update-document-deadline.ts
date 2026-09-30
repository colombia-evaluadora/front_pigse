import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"

import { documentDeadlineQueryKey } from "@/features/document-management/api/query/use-document-deadline"

/** `fn_gestion_documental_fecha_limite_guardar` (V522) solo devuelve la
 *  fecha que quedó -- no las excepciones, esas se piden aparte
 *  (invalidamos la query de lectura, que sí trae todo). */
interface UpdateDocumentDeadlineResult {
  fechaLimite: string | null
}

/** `PATCH /pigse/documentos/fecha-limite` (V522) — fija (o quita, con
 *  `null`) la fecha límite global. Solo Administrador/Secretaria
 *  Territorial (ver `DOCUMENT_DEADLINE_WRITERS`, `lib/auth-routes.ts`). */
async function updateDocumentDeadline(fechaLimite: string | null): Promise<UpdateDocumentDeadlineResult> {
  const path = apiPath("/documents/deadline", "/documentos/fecha-limite")
  const response = await api.patch<
    UpdateDocumentDeadlineResult | RowsEnvelope<UpdateDocumentDeadlineResult>
  >(path, { FECHALIMITE: fechaLimite })
  return unwrapRow(response)
}

interface UseUpdateDocumentDeadlineOptions {
  mutationConfig?: MutationConfig<typeof updateDocumentDeadline>
}

export function useUpdateDocumentDeadline({ mutationConfig }: UseUpdateDocumentDeadlineOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateDocumentDeadline,
    ...mutationConfig,
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: documentDeadlineQueryKey })
      await mutationConfig?.onSuccess?.(...args)
    },
  })
}
