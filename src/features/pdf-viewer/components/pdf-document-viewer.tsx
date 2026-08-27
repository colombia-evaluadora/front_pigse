"use no memo"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

import { Button } from "@/components/ui/button"
import { MinusIcon, PlusIcon, SpinnerIcon, WarningCircleIcon } from "@/components/ui/icons"
import { cn } from "@/lib/utils"

/**
 * El worker de pdf.js corre el parseo y el rasterizado FUERA del hilo
 * principal — sin él la UI se congela mientras abre el documento.
 *
 * La URL se arma con `new URL(..., import.meta.url)` en vez de apuntar a un
 * CDN: Vite la reescribe en build a un asset propio, así el visor sigue
 * funcionando sin salida a internet (requisito de un aplicativo estatal).
 *
 * OJO — `pdfjs-dist` tiene que estar clavado a la MISMA versión EXACTA que
 * declara `react-pdf` en sus dependencias (hoy `5.4.296`). El `pdfjs` de
 * arriba sale de `react-pdf`, pero este `new URL("pdfjs-dist/...")` resuelve
 * contra el `pdfjs-dist` de la raíz. Si los dos rangos no coinciden, pnpm
 * instala DOS copias y el visor muere con:
 *
 *     The API version "X" does not match the Worker version "Y"
 *
 * Por eso la dependencia va con versión exacta y no con `^`: un rango deja
 * que pnpm resuelva otra 5.x y vuelve el problema.
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString()

/**
 * Va a nivel de módulo y NO inline: `react-pdf` compara `options` por
 * identidad y vuelve a cargar el documento entero si el objeto cambia en
 * cada render.
 *
 * `standardFontDataUrl` y `cMapUrl` apuntan a `public/pdfjs/`, que un plugin
 * de `vite.config.ts` llena copiando los directorios de `pdfjs-dist` (ver
 * `pdfjsAssetsPlugin`). Van servidos por nosotros y no por un CDN para no
 * romper el modo offline.
 *
 * NO son opcionales: sin `standardFontDataUrl`, un PDF que use fuentes
 * estándar (Helvetica, Times…) SIN embeberlas —lo normal en exportaciones de
 * Word/LibreOffice— deja a pdf.js sin las métricas reales. El canvas se dibuja
 * igual con una sustituta, pero los `<span>` de la capa de texto quedan con
 * anchos que no corresponden, y al seleccionar el resaltado aparece corrido
 * respecto de las letras.
 */
const PDF_OPTIONS = {
  standardFontDataUrl: "/pdfjs/standard_fonts/",
  cMapUrl: "/pdfjs/cmaps/",
  cMapPacked: true,
} as const

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 0.25

interface PdfDocumentViewerProps {
  /**
   * Qué renderizar. Se acepta un `Blob` —los bytes ya descargados y
   * autenticados— o una URL suelta.
   *
   * El `Blob` es el camino normal en esta app: el endpoint del file-service
   * exige `Authorization: Bearer`, y pdf.js pide el binario internamente con
   * `fetch` sin forma de inyectarle cabeceras. Bajándolo antes con el cliente
   * autenticado y pasándole los bytes, pdf.js no toca la red — y de paso el
   * archivo queda cacheado para el botón de descarga.
   */
  file: string | Blob
  /** Solo para el `aria-label` del contenedor. */
  title: string
  className?: string
}

/**
 * Visor de PDF sobre `react-pdf` (el wrapper de React de pdf.js, el mismo
 * motor que usa Firefox).
 *
 * **Por qué no un `<iframe>`:** el visor nativo del navegador no es
 * controlable —no se le puede fijar el zoom, ni ocultar su barra, ni saber
 * cuándo terminó de cargar— y falla de formas que la app no puede manejar:
 * si la URL responde 401 o no resuelve, el usuario ve la página de error del
 * navegador incrustada en nuestra UI y nosotros no nos enteramos. Con pdf.js
 * el fallo llega como `onLoadError` y se puede mostrar en el idioma y el
 * estilo del resto del aplicativo.
 *
 * Renderiza TODAS las páginas en scroll continuo, como el visor nativo que
 * reemplaza. Para documentos muy largos esto monta muchos canvas; si algún
 * día pesa, el cambio es virtualizar la lista de páginas, no rehacer el
 * visor.
 */
export function PdfDocumentViewer({ file, title, className }: PdfDocumentViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  // Ancho del contenedor: `react-pdf` necesita un ancho en px para rasterizar
  // (no entiende `100%`). Se mide con `ResizeObserver` para que el documento
  // se re-renderice al cambiar el tamaño de la ventana o al plegar el
  // sidebar.
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      // `Math.floor` y no el valor crudo: `contentRect.width` viene con
      // decimales (847.328125). pdf.js rasteriza el canvas redondeando a
      // píxeles enteros, pero la capa de texto posiciona cada `<span>` con el
      // factor de escala fraccionario exacto. Esa diferencia es invisible en
      // el dibujo pero se acumula a lo largo del renglón, y al seleccionar el
      // resaltado aparece corrido respecto de las letras. Con un ancho entero
      // las dos capas parten del mismo número.
      setContainerWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Al cambiar de archivo se limpia el estado: si no, un documento nuevo
  // heredaba el `numPages` del anterior y pintaba páginas de más.
  useEffect(() => {
    setNumPages(null)
    setError(null)
  }, [file])

  const handleLoadSuccess = useCallback(({ numPages: total }: { numPages: number }) => {
    setNumPages(total)
    setError(null)
  }, [])

  const handleLoadError = useCallback((cause: Error) => {
    setError(cause.message || "No se pudo abrir el documento.")
  }, [])

  // La hoja ocupa todo el ancho de la card: sin fondo detrás no hay nada que
  // "enmarcar", así que restarle aire solo achicaría el área de lectura. Con
  // zoom > 100% desborda a propósito y aparece el scroll horizontal.
  // También entero tras aplicar el zoom, por el mismo motivo que el
  // `Math.floor` del ResizeObserver: 1.25 × 847 = 1058.75 volvería a meter
  // decimales en la escala.
  const pageWidth =
    containerWidth > 0 ? Math.max(240, Math.floor(containerWidth * zoom)) : undefined

  const paginas = useMemo(
    () => (numPages == null ? [] : Array.from({ length: numPages }, (_, index) => index + 1)),
    [numPages],
  )

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {/* Barra de zoom. Solo aparece con el documento ya abierto: sin páginas
          no hay nada que acercar y los botones quedarían muertos. */}
      {numPages != null && !error ? (
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-4 py-2">
          {/* El conteo va a la izquierda y el zoom a la derecha en vez de todo
              apelotonado al centro: la barra ocupa el ancho de la card y no
              queda un bloque de controles flotando en el medio. */}
          <span className="text-xs text-muted-foreground">
            {numPages} {numPages === 1 ? "página" : "páginas"}
          </span>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label="Alejar"
              disabled={zoom <= ZOOM_MIN}
              onClick={() => setZoom((value) => Math.max(ZOOM_MIN, value - ZOOM_STEP))}
            >
              <MinusIcon />
            </Button>
            {/* `tabular-nums` para que el ancho no salte al pasar de 100% a 75%. */}
            <span className="min-w-12 text-center text-xs font-medium tabular-nums text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              type="button"
              variant="ghost"
              color="neutral"
              size="icon-sm"
              aria-label="Acercar"
              disabled={zoom >= ZOOM_MAX}
              onClick={() => setZoom((value) => Math.min(ZOOM_MAX, value + ZOOM_STEP))}
            >
              <PlusIcon />
            </Button>
          </div>
        </div>
      ) : null}

      {/* El scroll vive ACÁ, dentro de la card: la página del visor no
          scrollea, así el encabezado con el nombre del archivo y esta barra
          de zoom quedan siempre a la vista.

          Sin fondo propio — hereda el de la card. Antes había un `bg-muted`
          simulando la mesa de un visor de escritorio, pero con la hoja
          blanca encima y el gris clarísimo del tema (`#d6dbe5` al 30%) no
          aportaba profundidad, solo suciedad visual. */}
      <div ref={containerRef} className="min-h-0 flex-1 overflow-auto">
        {error ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <WarningCircleIcon className="size-10 text-red" aria-hidden="true" />
            <p className="m-0! text-sm font-medium">No se pudo abrir el documento</p>
            <p className="m-0! max-w-md text-xs text-muted-foreground">{error}</p>
          </div>
        ) : (
          <Document
            file={file}
            options={PDF_OPTIONS}
            onLoadSuccess={handleLoadSuccess}
            onLoadError={handleLoadError}
            loading={
              <div className="flex h-full flex-col items-center justify-center gap-3">
                <SpinnerIcon
                  className="size-8 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="m-0! text-sm text-muted-foreground">Abriendo el documento…</p>
              </div>
            }
            // El error lo pinta el bloque de arriba con el estilo de la app;
            // el default de `react-pdf` es un texto en inglés sin formato.
            error={null}
            aria-label={title}
            className="flex flex-col items-center"
          >
            {paginas.map((numeroPagina) => (
              <Page
                key={numeroPagina}
                pageNumber={numeroPagina}
                width={pageWidth}
                // La capa de texto es lo que permite seleccionar y buscar con
                // Ctrl+F dentro del PDF; la de anotaciones, que los enlaces y
                // los campos de formulario sean clickeables.
                renderTextLayer
                renderAnnotationLayer
                // Sin sombra ni anillo: la hoja ya está sobre la card, no
                // flotando sobre una mesa gris. Entre página y página va una
                // línea de 1px —la última no la lleva, ahí cierra el borde de
                // la card— que es lo único que hace falta para leer dónde
                // termina una y empieza la otra.
                className="[&:not(:last-child)]:border-b [&:not(:last-child)]:border-border"
                loading={null}
              />
            ))}
          </Document>
        )}
      </div>
    </div>
  )
}
