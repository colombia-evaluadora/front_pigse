import { useDocumentCategoriesQuery } from "@/features/document-management/api/query/use-document-categories"
import type { DocumentType } from "@/features/document-management/api/types/document"
import { useComplianceDetailQuery } from "@/features/monitoring/api/query/use-compliance-detail"

import type { VisorSearch } from "@/features/pdf-viewer/api/schema"

/** Un archivo que el selector del visor puede abrir. */
export interface ViewerFile {
  archivoId: number
  fileName: string | null
  downloadUrl: string
  /** Anexo al que pertenece ("Plan de estudios", "SIEE"...). */
  categoriaName: string
}

/**
 * Todos los archivos del mismo documento (tipo) que el abierto, para que el
 * visor permita saltar entre ellos sin volver al listado.
 *
 * Se reusa la MISMA query que la pantalla de origen (ya está en cache):
 * - monitoreo → detalle documental del EE (`/cumplimiento/establecimientos/
 *   :id/documentos/:tipo`), que los roles territoriales sí pueden leer.
 * - gestión documental → anexos del EE del token (`/documentos/:tipo/
 *   categorias`), solo para los roles del colegio.
 * Sin origen no se consulta nada: el visor queda con el archivo de la URL.
 */
export function useViewerFiles(search: VisorSearch, type: DocumentType) {
  const desdeMonitoreo = search.origen === "monitoreo" && search.establecimientoId != null
  const monitoreo = useComplianceDetailQuery(
    desdeMonitoreo ? search.establecimientoId : null,
    desdeMonitoreo ? type : null,
  )
  const gestion = useDocumentCategoriesQuery(type, { enabled: search.origen === "gestion" })

  if (desdeMonitoreo) {
    const files: ViewerFile[] = (monitoreo.data?.categorias ?? []).flatMap((categoria) =>
      categoria.archivos.map((archivo) => ({
        archivoId: archivo.archivoId,
        fileName: archivo.fileName,
        downloadUrl: archivo.downloadUrl ?? `/api/files/download/${archivo.archivoId}`,
        categoriaName: categoria.categoriaName.replace(/\s*\(opcional\)\s*$/i, ""),
      })),
    )
    return { files, establishmentName: monitoreo.data?.establishmentName }
  }

  if (search.origen === "gestion") {
    const files: ViewerFile[] = (gestion.data ?? [])
      .filter((categoria) => categoria.archivoId != null)
      .map((categoria) => ({
        archivoId: categoria.archivoId as number,
        fileName: categoria.fileName,
        downloadUrl: categoria.downloadUrl ?? `/api/files/download/${categoria.archivoId}`,
        categoriaName: categoria.categoriaName.replace(/\s*\(opcional\)\s*$/i, ""),
      }))
    return { files, establishmentName: undefined }
  }

  return { files: [] as ViewerFile[], establishmentName: undefined }
}

