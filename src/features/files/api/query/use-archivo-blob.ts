import { useQuery, useQueryClient } from "@tanstack/react-query"

import { fetchArchivoBlob } from "@/lib/files"

/**
 * El Blob se cachea 10 minutos. Es el binario entero en memoria, así que
 * tampoco conviene retenerlo eternamente: un PDF institucional puede pesar
 * varios MB y la pestaña no se cierra en toda la jornada.
 */
const BLOB_STALE_MS = 10 * 60 * 1000

export const archivoBlobQueryKey = (archivoId: number | null | undefined) => [
  "archivo-blob",
  archivoId,
]

/**
 * Trae el binario de un archivo y lo deja en la cache de React Query.
 *
 * Se cachea el **Blob**, no el object URL: un `blob:` URL hay que revocarlo
 * cuando el componente que lo usa se desmonta, y si la cache guardara URLs
 * quedarían punteros a memoria ya liberada la próxima vez que se lea la misma
 * entrada. Guardando el Blob, cada consumidor crea (y revoca) su propia URL
 * sobre los mismos bytes.
 */
export function useArchivoBlob(
  archivoId: number | null | undefined,
  downloadUrl: string | null | undefined,
) {
  return useQuery({
    queryKey: archivoBlobQueryKey(archivoId),
    queryFn: () => fetchArchivoBlob(downloadUrl as string),
    enabled: archivoId != null && !!downloadUrl,
    staleTime: BLOB_STALE_MS,
    gcTime: BLOB_STALE_MS,
  })
}

/**
 * Precarga el binario sin renderizarlo. Se dispara en el `hover` del badge de
 * estado: para cuando el usuario decide entrar al visor, el PDF ya está en
 * memoria y la pantalla abre instantánea en vez de mostrar el spinner.
 *
 * `prefetchQuery` es un no-op si la entrada ya está fresca, así que pasar el
 * cursor varias veces sobre la misma fila no dispara descargas repetidas.
 */
export function useArchivoBlobPrefetch() {
  const queryClient = useQueryClient()

  return function prefetch(
    archivoId: number | null | undefined,
    downloadUrl: string | null | undefined,
  ) {
    if (archivoId == null || !downloadUrl) return
    void queryClient.prefetchQuery({
      queryKey: archivoBlobQueryKey(archivoId),
      queryFn: () => fetchArchivoBlob(downloadUrl),
      staleTime: BLOB_STALE_MS,
    })
  }
}
