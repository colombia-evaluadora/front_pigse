import { useState } from "react"
import { Link, useNavigate, useParams, useSearch } from "@tanstack/react-router"

import {
  ArrowLeftIcon,
  CaretLeftIcon,
  CaretRightIcon,
  FileDownloadOutlinedIcon,
  SpinnerIcon,
} from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { paths } from "@/config/paths"
import { downloadArchivo } from "@/lib/files"
import { cn } from "@/lib/utils"
import { useNotify } from "@/components/notice/notice-context"
import { useArchivoBlob } from "@/features/files/api/query/use-archivo-blob"
import { fileKindMeta, isPreviewable } from "@/features/files/lib/file-kind"
import { PdfDocumentViewer } from "@/features/pdf-viewer/components/pdf-document-viewer"
import { useViewerFiles, type ViewerFile } from "@/features/pdf-viewer/api/use-viewer-files"

import {
  documentTypeDisplayName,
  type DocumentType,
} from "@/features/document-management/api/types/document"

import type { VisorSearch } from "@/features/pdf-viewer/api/schema"

const VALID_TYPES = new Set<string>(["PEI", "PEC", "PMI", "PFI"])

function isDocumentType(value: string): value is DocumentType {
  return VALID_TYPES.has(value)
}

/**
 * Alto del área de lectura: FIJO y atado al viewport (`h-full` no funciona
 * porque `TableScreenBody` no fija altura). Se resta el cromo que la rodea:
 * header de la app, título con bajada, padding del body y del layout (~13rem)
 * y, cuando hay selector de archivos, su barra (~3.5rem). `svh` para que en
 * móvil no la tape la barra del navegador; el `min-h` es el piso legible.
 * Clases literales: Tailwind no ve strings armados.
 */
const ALTO_VISOR = "h-[calc(100svh-13rem)] min-h-80"
const ALTO_VISOR_CON_SELECTOR = "h-[calc(100svh-16.5rem)] min-h-80"

/**
 * Visor de documentos institucionales. Abre UN archivo (`archivoId`) y, si
 * se llegó desde el detalle documental (monitoreo) o desde los anexos
 * (gestión documental), ofrece saltar entre los demás archivos del mismo
 * documento y volver exactamente a esa pantalla.
 *
 * Solo el PDF se previsualiza (pdf.js); Word/Excel muestran un aviso con la
 * descarga. La referencia al binario llega por la URL y no consultando
 * `/documentos`: los roles del tablero no tienen permiso ahí (ver
 * `visorSearchSchema`).
 */
export function PdfViewerPage() {
  const params = useParams({ strict: false }) as { type?: string }
  const search = useSearch({ strict: false }) as VisorSearch
  const navigate = useNavigate()

  const rawType = params.type ?? ""
  const type: DocumentType = isDocumentType(rawType) ? rawType : "PEI"
  const displayName = documentTypeDisplayName(type)

  const { files, establishmentName: nombreDesdeDetalle } = useViewerFiles(search, type)
  const establishmentName = search.establishmentName ?? nombreDesdeDetalle

  const { archivoId } = search
  const actual = files.find((file) => file.archivoId === archivoId)
  const fileName = search.fileName ?? actual?.fileName ?? `${type}_documento.pdf`
  const downloadUrl =
    search.downloadUrl ??
    actual?.downloadUrl ??
    (archivoId != null ? `/api/files/download/${archivoId}` : undefined)
  const esPdf = isPreviewable(search.fileName ?? actual?.fileName)

  const {
    data: archivo,
    isPending: archivoPending,
    isError: archivoError,
    refetch: reintentar,
  } = useArchivoBlob(esPdf ? archivoId : undefined, downloadUrl)

  // Una query DESHABILITADA reporta `isPending` (React Query v5): el spinner
  // exige que exista algo que cargar, si no un documento sin archivo
  // quedaría cargando para siempre.
  const cargando = esPdf && archivoId != null && archivoPending && !archivoError

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

  function abrir(file: ViewerFile) {
    navigate({
      to: paths.app.visor.getHref(type),
      search: {
        ...search,
        archivoId: file.archivoId,
        fileName: file.fileName ?? undefined,
        downloadUrl: file.downloadUrl,
      },
      replace: true,
    })
  }

  const backTo =
    search.origen === "monitoreo" && search.establecimientoId != null
      ? paths.app.monitoreoCumplimientoDetalle.getHref(search.establecimientoId, type)
      : search.origen === "gestion"
        ? paths.app.gestionDocumentalDetalle.getHref(type)
        : establishmentName
          ? paths.app.monitoreoCumplimiento.getHref()
          : paths.app.gestionDocumental.getHref()

  const indice = files.findIndex((file) => file.archivoId === archivoId)
  const conSelector = files.length > 1
  const alto = conSelector ? ALTO_VISOR_CON_SELECTOR : ALTO_VISOR
  const meta = fileKindMeta(fileName)

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description={
            <span className="block truncate">
              {establishmentName ? `${establishmentName} · ` : ""}
              {fileName}
            </span>
          }
          action={
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
                disabled={archivoId == null || descargando}
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
        {conSelector ? (
          <div className="mb-3 flex items-center gap-2">
            <Button
              variant="outline"
              color="neutral"
              size="icon-sm"
              type="button"
              aria-label="Archivo anterior"
              disabled={indice <= 0}
              onClick={() => abrir(files[indice - 1])}
            >
              <CaretLeftIcon />
            </Button>
            <label htmlFor="visor-archivo" className="sr-only">
              Archivo del documento
            </label>
            <NativeSelect
              id="visor-archivo"
              className="min-w-0 flex-1"
              value={indice >= 0 ? String(files[indice].archivoId) : ""}
              onChange={(event) => {
                const elegido = files.find((file) => String(file.archivoId) === event.target.value)
                if (elegido) abrir(elegido)
              }}
            >
              {indice < 0 ? <NativeSelectOption value="">{fileName}</NativeSelectOption> : null}
              {files.map((file) => (
                <NativeSelectOption key={file.archivoId} value={String(file.archivoId)}>
                  {file.categoriaName} — {file.fileName ?? `Archivo ${file.archivoId}`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <span className="hidden text-xs whitespace-nowrap text-muted-foreground tabular-nums sm:inline">
              {indice >= 0 ? `${indice + 1} de ${files.length}` : `${files.length} archivos`}
            </span>
            <Button
              variant="outline"
              color="neutral"
              size="icon-sm"
              type="button"
              aria-label="Archivo siguiente"
              disabled={indice < 0 || indice >= files.length - 1}
              onClick={() => abrir(files[indice + 1])}
            >
              <CaretRightIcon />
            </Button>
          </div>
        ) : null}

        {archivo?.blob && esPdf ? (
          /*
            pdf.js (vía `react-pdf`) sobre canvas, sin iframe: un frame no
            avisa si el binario falla y queda a merced de X-Frame-Options. Se
            le pasa el Blob ya bajado con el cliente autenticado porque pdf.js
            no puede mandar `Authorization`.
          */
          <PdfDocumentViewer
            key={archivoId}
            file={archivo.blob}
            title={`${displayName} · ${fileName}`}
            className={cn("overflow-hidden rounded-md border border-border", alto)}
          />
        ) : (
          <div
            role={cargando ? "status" : undefined}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-4 rounded-md border border-border p-8",
              alto,
            )}
          >
            {cargando ? (
              <>
                <SpinnerIcon className="size-8 animate-spin text-muted-foreground" aria-hidden />
                <p className="m-0! text-sm text-muted-foreground">Abriendo el documento…</p>
              </>
            ) : (
              <>
                <span
                  className={cn("flex size-16 items-center justify-center rounded-xl", meta.tone)}
                >
                  <meta.Icon className="size-9" aria-hidden />
                </span>
                <div className="text-center">
                  <p className="m-0! text-lg font-semibold text-pretty break-all">{fileName}</p>
                  <p className="m-0! mt-1 text-sm text-muted-foreground">{displayName}</p>
                </div>
                <p className="m-0! max-w-md text-center text-sm text-muted-foreground">
                  {archivoId == null
                    ? "No se indicó qué archivo abrir. Vuelve al detalle y elige un archivo."
                    : !esPdf
                      ? `Vista previa no disponible para archivos ${meta.label}. Descarga el archivo para verlo.`
                      : "No se pudo abrir el documento."}
                </p>
                {archivoId != null ? (
                  <div className="flex flex-wrap justify-center gap-2">
                    {esPdf && archivoError ? (
                      <Button
                        variant="outline"
                        color="neutral"
                        size="sm"
                        type="button"
                        onClick={() => reintentar()}
                      >
                        Reintentar
                      </Button>
                    ) : null}
                    <Button
                      variant="fill"
                      color="primary"
                      size="sm"
                      type="button"
                      disabled={descargando}
                      onClick={handleDownload}
                    >
                      <FileDownloadOutlinedIcon data-icon="inline-start" />
                      Descargar archivo
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
