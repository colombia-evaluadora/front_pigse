import { useMutation, useQueryClient } from "@tanstack/react-query"

import { apiPath } from "@/lib/api-paths"
import { postMultipart } from "@/lib/files"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import type { MutationConfig } from "@/lib/react-query"

import { documentsQueryKey } from "@/features/document-management/api/query/use-documents"
import type {
  Document,
  DocumentMutationResult,
  DocumentType,
} from "@/features/document-management/api/types/document"

/**
 * `POST /pigse/documentos/upload` (multipart/form-data).
 *
 * Los nombres de los campos son EXACTOS y salen de `public.query.param_types`
 * (`id_query = 195`):
 *
 *   { "BODY.TIPO": "TEXT!", "BODY.ARCHIVO": "FILE:documentoInstitucional!" }
 *
 * - `TIPO`    → PEI | PEC | PMI. El `!` marca que es obligatorio.
 * - `ARCHIVO` → el binario. El prefijo `FILE:` le dice al file-service que
 *   intercepte el campo, suba el binario a S3, lo registre en `TARCHIVO` con
 *   la clasificación `documentoInstitucional` y reemplace el campo por el
 *   `pk_tarchivo` resultante antes de reenviar al query-service.
 *
 * Un campo con otro nombre (o en minúscula) lo rechaza el file-service con
 * 400 antes de tocar S3: la validación es por nombre, no por contenido.
 *
 * El establecimiento NO viaja en el body — el backend lo resuelve del token
 * (`:CONTEXT.EMAIL` -> `fn_pigse_mi_establecimiento`), así que un usuario solo
 * puede cargar documentos de su propio EE.
 *
 * Roles autorizados en la BD: `PIGSE-ADMINISTRADOR`, `PIGSE-SECRETARIO`.
 */
async function uploadDocument(params: {
  type: DocumentType
  file: File
}): Promise<DocumentMutationResult> {
  const path = apiPath("/documents/upload", "/documentos/upload")
  // Mismo motivo que en `use-delete-document.ts`: el gateway devuelve
  // `{ rows: [fila] }` y sin desenvolver el `status`/`message` de la fila
  // nunca llegaban al diálogo. `unwrapRow` es no-op en mock.
  const response = await postMultipart<
    DocumentMutationResult | RowsEnvelope<DocumentMutationResult>
  >(path, { TIPO: params.type }, { ARCHIVO: params.file })
  return unwrapRow(response)
}

interface UseUploadDocumentOptions {
  mutationConfig?: MutationConfig<typeof uploadDocument>
}

export function useUploadDocument({ mutationConfig }: UseUploadDocumentOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: uploadDocument,
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

/**
 * Helper para construir la `File` que se va a mandar desde el componente de
 * UI (que trabaja con `File | null`). Lanza si lo que se manda es `null`:
 * el botón de carga ya está deshabilitado en ese caso, así que pasar null
 * acá es un error de programación.
 */
export function toUploadDocumentParams(
  type: DocumentType,
  file: File | null,
): { type: DocumentType; file: File } {
  if (!file) {
    throw new Error("Se requiere un archivo para cargar el documento.")
  }
  return { type, file }
}

export type { Document }
