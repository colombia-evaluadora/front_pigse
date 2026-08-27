import { useState } from "react"
import { Link, useParams, useSearch } from "@tanstack/react-router"

import {
  ArrowLeftIcon,
  FileDownloadOutlinedIcon,
  FilePdfIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { paths } from "@/config/paths"
import { downloadArchivo } from "@/lib/files"
import { useNotify } from "@/components/notice/notice-context"
import { useArchivoBlob } from "@/features/files/api/query/use-archivo-blob"
import { PdfDocumentViewer } from "@/features/pdf-viewer/components/pdf-document-viewer"

import {
  documentTypeDisplayName,
  type DocumentType,
} from "@/features/document-management/api/types/document"

import type { VisorSearch } from "@/features/pdf-viewer/api/schema"

const VALID_TYPES = new Set<string>(["PEI", "PEC", "PMI"])

function isDocumentType(value: string): value is DocumentType {
  return VALID_TYPES.has(value)
}

/**
 * Alto del área de lectura.
 *
 * Es FIJO y atado al viewport, no `h-full`: `h-full` solo funciona si cada
 * padre de la cadena tiene altura definida, y `TableScreenBody` es `grow`
 * dentro de un contenedor que no la fija. Sin esto la card crecía con el
 * documento y terminaba scrolleando la ventana entera en vez de scrollear
 * ella.
 *
 * Los ~13rem que se restan son el cromo que la rodea: el header de la app
 * (`h-14` = 3.5rem), el `TableScreenTitle` con su bajada (~5.5rem), el
 * `py-4` del `TableScreenBody` (2rem) y el `pb-4` del layout (1rem). Si se
 * le agrega una pieza al encabezado (una barra de herramientas, pestañas),
 * hay que ajustar este número.
 *
 * `svh` y no `vh` para que en móvil no la tape la barra del navegador. El
 * `min-h` es el piso: en una ventana muy baja, mejor que scrollee la página
 * a que el visor quede de un alto ilegible.
 */
const ALTO_VISOR = "h-[calc(100svh-13rem)] min-h-80"

/**
 * Visor de PDF del documento vigente de un establecimiento.
 *
 * Se accede desde dos lugares:
 *   - El botón "Consultar" del `DocumentDetailPopover` (vista
 *     institucional del EE).
 *   - El botón "Consultar Documento" del `ComplianceStatusCell`
 *     (vista del monitor, una fila por EE).
 *
 * El parámetro `type` viene del segmento de la URL (`visor/$type`).
 * `establishmentName` y `fileName` viajan como query params para que
 * el encabezado muestre el contexto del archivo sin tener que volver a
 * pegarle al backend solo para el título.
 */
export function PdfViewerPage() {
  const params = useParams({ strict: false }) as { type?: string }
  const search = useSearch({ strict: false }) as VisorSearch

  const rawType = params.type ?? ""
  const type: DocumentType = isDocumentType(rawType) ? rawType : "PEI"
  const displayName = documentTypeDisplayName(type)
  const establishmentName = search.establishmentName
  const fileName = search.fileName ?? `${type}_documento.pdf`

  // El visor recibe solo el `type` por la URL, no el `downloadUrl`. Se lo pide
  // a la lista de documentos, que ya está en cache de React Query (la pantalla
  // de gestión documental la dejó cargada al navegar hasta acá).
  // El archivo llega por la URL, NO se resuelve consultando `/documentos`.
  // Ver el javadoc de `visorSearchSchema`: al visor se llega desde Gestión
  // documental (EE propio) y desde Monitoreo (cualquier EE), y los roles
  // territoriales del segundo caso no tienen permiso sobre `/documentos`.
  const { archivoId, downloadUrl } = search
  // El binario se baja con el cliente autenticado y se le pasa a pdf.js como
  // Blob. Si el usuario pasó el cursor por la fila antes de entrar, ya está
  // cacheado (ver el prefetch del popover) y la pantalla abre instantánea.
  const { data: archivo, isPending: archivoPending } = useArchivoBlob(archivoId, downloadUrl)

  // En React Query v5 una query DESHABILITADA reporta `isPending`, no `idle`.
  // Si se mirara `archivoPending` a secas, un documento sin archivo (donde el
  // hook queda deshabilitado por `archivoId == null`) mostraría el spinner
  // para siempre en vez del mensaje de "todavía no hay archivo". Por eso el
  // spinner exige que EXISTA algo que cargar.
  const cargando = archivoId != null && archivoPending

  const [descargando, setDescargando] = useState(false)
  const { notify } = useNotify()

  async function handleDownload() {
    if (!downloadUrl) return
    setDescargando(true)
    try {
      await downloadArchivo(downloadUrl, fileName, archivo?.blob)
    } catch (error) {
      notify(error instanceof Error ? error.message : "No se pudo descargar el documento.", {
        variant: "error",
      })
    } finally {
      setDescargando(false)
    }
  }

  // Volvemos al lugar del que vinieron: gestión documental del EE o el
  // tablero del monitor, según `establishmentName`.
  const backTo = establishmentName
    ? paths.app.monitoreoCumplimiento.getHref()
    : paths.app.gestionDocumental.getHref()

  return (
    <TableScreen>
      <TableScreenHeader>
        {/* El nombre del archivo va como bajada del título y no como una
            franja aparte: es el subtítulo natural del documento, igual que
            "IE DENZIL EDUCATIVA · DETALLE DOCUMENTOS" en gestión documental. */}
        <TableScreenTitle
          description={
            <span className="block truncate">
              {establishmentName ? `${establishmentName} · ` : ""}
              {fileName}
            </span>
          }
          action={
            // "Volver" va acá y no a la izquierda del título: es el mismo
            // criterio que las operaciones de auditoría (ver el docstring de
            // `TableScreenTitle`).
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                color="neutral"
                size="sm"
                type="button"
                render={<Link to={backTo} />}
                nativeButton={false}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Volver
              </Button>
              <Button
                size="sm"
                variant="fill"
                color="primary"
                type="button"
                disabled={!downloadUrl || descargando}
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
          }
        >
          {displayName}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        {archivo?.blob ? (
          /*
            El PDF se renderiza con pdf.js (vía `react-pdf`) sobre un canvas:
            sin `<iframe>`, sin `<object>` y sin `<embed>`. Un frame no era
            controlable ni observable —si el binario fallaba, el navegador
            pintaba SU página de error dentro de nuestra UI y la app no se
            enteraba— y además quedaba a merced de `X-Frame-Options`.

            Se le pasa el `Blob` y no una URL: el endpoint exige
            `Authorization: Bearer` y pdf.js pide el binario internamente con
            `fetch`, sin forma de inyectarle cabeceras. Bajándolo antes con el
            cliente autenticado, pdf.js ni toca la red.
          */
          <PdfDocumentViewer
            file={archivo.blob}
            title={`${displayName} · ${fileName}`}
            // Ya está DENTRO de la card que pone `TableScreenBody`, así que
            // solo lleva un borde que delimite el área de lectura del padding
            // de la card — nada de fondo ni sombra propios.
            className={`overflow-hidden rounded-md border border-border ${ALTO_VISOR}`}
          />
        ) : (
          <div
            className={`flex w-full flex-col items-center justify-center gap-4 rounded-md border border-border p-8 ${ALTO_VISOR}`}
          >
            {cargando ? (
              <>
                <SpinnerIcon
                  className="size-8 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="m-0! text-sm text-muted-foreground">Abriendo el documento…</p>
              </>
            ) : (
              <>
                <FilePdfIcon className="size-16 text-red" aria-hidden="true" />
                <div className="text-center">
                  <p className="m-0! text-lg font-semibold text-pretty">{fileName}</p>
                  <p className="m-0! mt-1 text-sm text-muted-foreground">{displayName}</p>
                </div>
                <p className="m-0! max-w-md text-center text-sm text-muted-foreground">
                  {archivoId == null
                    ? "Este documento todavía no tiene un archivo cargado."
                    : "No se pudo abrir el documento. Volvé a intentar desde el listado."}
                </p>
              </>
            )}
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
