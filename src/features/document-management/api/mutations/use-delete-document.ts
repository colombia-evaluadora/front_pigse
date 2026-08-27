import { useMutation, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"

import { documentsQueryKey } from "@/features/document-management/api/query/use-documents"
import type {
  DocumentMutationResult,
  DocumentType,
} from "@/features/document-management/api/types/document"

/**
 * `PATCH /pigse/documentos/:TIPO` — elimina la versión VIGENTE del documento.
 *
 * **Es PATCH, no DELETE.** El backend lo registra así en `public.query`
 * (`id_query = 196`, `http_method = 'PATCH'`) porque la operación no borra
 * la fila: llama a `academico_test.fn_pigse_documento_eliminar(...)`, que
 * hace una baja lógica — el archivo pasa al historial de "versiones
 * anteriores" y el documento vuelve a `PENDIENTE`. Semánticamente es una
 * actualización parcial del estado, no una eliminación del recurso.
 *
 * El backend resuelve el establecimiento del usuario a partir del token
 * (`:CONTEXT.EMAIL` → `fn_pigse_mi_establecimiento`), así que el front no
 * manda el EE: un usuario solo puede tocar los documentos de su propio
 * establecimiento.
 *
 * Devuelve la fila ya actualizada: `status` pasa a `PENDIENTE` y los campos
 * `fileName`/`uploadedAt`/`sizeBytes` quedan en `null`.
 *
 * Roles autorizados en la BD: `PIGSE-ADMINISTRADOR`, `PIGSE-SECRETARIO`.
 */
async function deleteCurrentDocumentVersion(type: DocumentType): Promise<DocumentMutationResult> {
  const url = apiPath(`/documents/${type}`, `/documentos/${type}`)
  // El gateway envuelve TODO resultado en `{ rows: [...] }`, incluso el de una
  // mutación registrada como `SELECT fn_x(...)` (que vuelve como una única
  // fila). Sin desenvolver, `result.status` era `undefined` contra el backend
  // real: el branch de error NUNCA se cumplía y el diálogo cantaba
  // "eliminado correctamente" aunque la función SQL hubiera rechazado la
  // operación. `unwrapRow` es no-op en mock.
  const response = await api.patch<DocumentMutationResult | RowsEnvelope<DocumentMutationResult>>(
    url,
  )
  return unwrapRow(response)
}

interface UseDeleteDocumentOptions {
  mutationConfig?: MutationConfig<typeof deleteCurrentDocumentVersion>
}

export function useDeleteCurrentDocumentVersion({ mutationConfig }: UseDeleteDocumentOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteCurrentDocumentVersion,
    ...mutationConfig,
    // Se AWAITEA la invalidación a propósito: devolver la promesa hace que
    // React Query mantenga la mutación en `isPending` hasta que la lista
    // esté fresca. Sin eso el diálogo se cierra antes del refetch y la fila
    // queda un instante con el estado viejo (el botón sigue diciendo
    // "Subir" cuando el documento ya está COMPLETO).
    onSuccess: async (...args) => {
      await queryClient.invalidateQueries({ queryKey: documentsQueryKey })
      await mutationConfig?.onSuccess?.(...args)
    },
  })
}
