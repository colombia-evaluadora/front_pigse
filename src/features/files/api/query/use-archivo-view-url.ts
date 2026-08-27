import { useQuery } from "@tanstack/react-query"

import { fetchArchivoViewUrl } from "@/lib/files"

/** El backend acuña tokens de vista de 5 minutos (`ViewTokenService`). */
const TOKEN_TTL_MS = 5 * 60 * 1000

/** Margen para renovar ANTES de que expire y no mostrar una imagen rota. */
const REFRESH_MARGIN_MS = 60 * 1000

export const archivoViewUrlQueryKey = (archivoId: number | null | undefined) => [
  "archivo-view-url",
  archivoId,
]

/**
 * URL lista para un `<img src>` a partir de un `pk_tarchivo`.
 *
 * El token viaja en la URL porque una etiqueta `<img>` no puede mandar
 * `Authorization`; por eso mismo es de un solo archivo y de vida corta. La
 * query se refresca sola un minuto antes de que caduque: si se dejara cachear
 * más, la imagen empezaría a fallar sin que nada lo delate.
 */
export function useArchivoViewUrl(archivoId: number | null | undefined) {
  return useQuery({
    queryKey: archivoViewUrlQueryKey(archivoId),
    queryFn: () => fetchArchivoViewUrl(archivoId as number),
    enabled: archivoId != null,
    staleTime: TOKEN_TTL_MS - REFRESH_MARGIN_MS,
    refetchInterval: TOKEN_TTL_MS - REFRESH_MARGIN_MS,
    select: (data) => data.url,
  })
}
