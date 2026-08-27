import { ImageIcon } from "@/components/ui/icons"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

import { useArchivoViewUrl } from "@/features/files/api/query/use-archivo-view-url"

interface ArchivoImageProps {
  /** `pk_tarchivo`. `null` = el registro no tiene imagen cargada. */
  archivoId: number | null | undefined
  alt: string
  className?: string
  /** Qué mostrar cuando no hay imagen; por defecto, un ícono apagado. */
  fallback?: React.ReactNode
}

/**
 * Imagen guardada en `TARCHIVO`, pedida por su `pk_tarchivo`.
 *
 * No recibe una URL: la resuelve sola acuñando un token de vista (ver
 * `useArchivoViewUrl`). Quien la usa solo necesita el id que ya trae el
 * registro —`fk_tarchivo` del establecimiento, por ejemplo—, sin saber nada
 * del mecanismo de tokens.
 *
 * Los tres estados se distinguen a propósito: cargando (skeleton), sin imagen
 * (fallback) y error al acuñar el token (también fallback, porque para el
 * usuario "no se ve" es lo mismo y un error acá no es accionable).
 */
export function ArchivoImage({ archivoId, alt, className, fallback }: ArchivoImageProps) {
  const { data: url, isPending, isError } = useArchivoViewUrl(archivoId)

  if (archivoId == null || isError) {
    return (
      fallback ?? (
        <div
          className={cn(
            "flex items-center justify-center rounded-md bg-muted text-muted-foreground",
            className,
          )}
        >
          <ImageIcon className="size-6" />
          <span className="sr-only">{alt} — sin imagen</span>
        </div>
      )
    )
  }

  if (isPending || !url) {
    return <Skeleton className={cn("rounded-md", className)} />
  }

  return <img src={url} alt={alt} className={cn("rounded-md object-contain", className)} />
}
