import { useState } from "react"
import { Link } from "@tanstack/react-router"

import { EyeIcon, FileDownloadOutlinedIcon, FilePdfIcon, SpinnerIcon } from "@/components/ui/icons"

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/overlay/hover-card"
import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { downloadArchivo } from "@/lib/files"
import { useArchivoBlob, useArchivoBlobPrefetch } from "@/features/files/api/query/use-archivo-blob"
import { useNotify } from "@/components/notice/notice-context"

import type { Document } from "@/features/document-management/api/types/document"

interface DocumentDetailPopoverProps {
  document: Document
  children: React.ReactNode
}

/**
 * Overlay que muestra el detalle del archivo vigente al pasar el cursor
 * sobre el badge de estado: nombre del archivo, fecha de carga y dos
 * acciones.
 *
 * - `Consultar`: enlace al **visor de PDF** (`/app/visor/:type`) que
 *   muestra la página completa del documento. Reemplaza al viejo
 *   diálogo de versiones: como el catálogo de versiones del mock es
 *   chico (1 vigente + 2 históricas como mucho) y cada versión se
 *   gestiona en su propia fila, no tiene sentido abrir un modal que
 *   muestre "X de Y" — el usuario lo que quiere es ver el archivo.
 * - `Descargar`: descarga directa del archivo vigente (placeholder
 *   hasta enchufar `file-service`).
 *
 * Cada `HoverCard` se monta por fila, así que pasar el cursor a otra
 * fila cierra la tarjeta anterior sin coordinación extra.
 */
export function DocumentDetailPopover({ document, children }: DocumentDetailPopoverProps) {
  // Los hooks van ANTES del early return de abajo: si se declaran después,
  // el orden de hooks cambia entre una fila con archivo y una sin archivo y
  // React rompe.
  const [descargando, setDescargando] = useState(false)
  const { notify } = useNotify()

  // Precarga del binario al pasar el cursor. Para cuando el usuario decide
  // entrar al visor, el PDF ya está en memoria y la pantalla abre sin
  // spinner. `prefetchQuery` es no-op si la entrada ya está fresca, así que
  // pasar el cursor varias veces no dispara descargas repetidas.
  const prefetchArchivo = useArchivoBlobPrefetch()

  // Lee la MISMA entrada de cache que llena el prefetch (sin dispararla: el
  // hook queda deshabilitado hasta que haya algo). Si ya está, el botón de
  // descargar guarda esos bytes en vez de volver a pegarle a la red.
  const { data: archivo } = useArchivoBlob(document.archivoId, document.downloadUrl)

  async function handleDownload() {
    if (!document.downloadUrl) return
    setDescargando(true)
    try {
      // No es un `<a href download>`: el endpoint exige `Authorization:
      // Bearer` y un enlace plano no manda cabeceras. Ver `downloadArchivo`.
      await downloadArchivo(
        document.downloadUrl,
        document.fileName ?? `${document.type}.pdf`,
        archivo?.blob,
      )
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo descargar el documento.", {
        variant: "error",
      })
    } finally {
      setDescargando(false)
    }
  }

  if (!document.fileName) {
    // Sin archivo no hay nada que mostrar: devolvemos el trigger pelado
    // (el badge de "Pendiente"), que ya es lo único que la columna pinta
    // en ese caso.
    return <>{children}</>
  }

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={150}
        closeDelay={120}
        render={
          <span
            className="inline-flex cursor-pointer"
            // El prefetch va en el `onMouseEnter` del trigger y no en el
            // `onOpenChange` del HoverCard: así arranca apenas el cursor toca
            // la fila, sin esperar los 150ms de `delay` que tarda en abrirse
            // la tarjeta. `onFocus` cubre la navegación por teclado.
            onMouseEnter={() => prefetchArchivo(document.archivoId, document.downloadUrl)}
            onFocus={() => prefetchArchivo(document.archivoId, document.downloadUrl)}
          >
            {children}
          </span>
        }
      />
      <HoverCardContent side="right" align="center" sideOffset={12} className="w-80 rounded-xl">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-red/10 text-red">
              <FilePdfIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0! truncate text-sm font-semibold text-pretty">{document.fileName}</p>
              {document.uploadedAt ? (
                <p className="m-0! text-xs text-muted-foreground">
                  Versión vigente · Cargado el{" "}
                  {new Date(document.uploadedAt).toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="outline"
              color="neutral"
              type="button"
              render={
                <Link
                  to={paths.app.visor.getHref(document.type)}
                  search={{
                    fileName: document.fileName ?? undefined,
                    archivoId: document.archivoId ?? undefined,
                    downloadUrl: document.downloadUrl ?? undefined,
                  }}
                />
              }
            >
              <EyeIcon data-icon="inline-start" />
              Consultar
            </Button>
            <Button
              size="sm"
              color="primary"
              type="button"
              disabled={!document.downloadUrl || descargando}
              onClick={handleDownload}
            >
              {descargando ? (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <FileDownloadOutlinedIcon data-icon="inline-start" />
              )}
              Descargar
            </Button>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
