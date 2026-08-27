import Axios from "axios"
import type { AxiosResponse } from "axios"

import { env } from "@/config/env"
import { authRequestInterceptor } from "@/lib/api-client"
import { filenameFromContentDisposition, messageFromBlobError, saveBlob } from "@/lib/blob-download"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/institution/api/types/export"

/**
 * Cliente de los reportes del `reporting-service`.
 *
 * Instancia propia y no `api` por una razón concreta: el interceptor de
 * respuesta de `api` devuelve `response.data` y descarta el resto, pero acá
 * las cabeceras son parte del resultado — `Content-Disposition` trae el nombre
 * del archivo y `X-Report-Rows` cuántos registros salieron. El request
 * interceptor sí se reutiliza, así que manda el mismo Bearer que el resto de
 * la app.
 *
 * El backend responde el binario en el cuerpo (no una URL), así que la
 * descarga se arma acá con un object URL.
 */
const reportApi = Axios.create({
  baseURL: env.API_URL,
  // Todo lo que devuelve el servicio es binario… incluidos los errores, que
  // llegan como JSON pero envueltos en un Blob. Ver `mensajeDeError`.
  responseType: "blob",
})

reportApi.interceptors.request.use(authRequestInterceptor)

/**
 * Claves registradas en el catálogo del `reporting-service`
 * (`reporting.reports.*` de su `application.yml`). Cada una corresponde a una
 * fila `…/reporte` en `public.query`.
 */
export type ReportKey =
  | "funcionarios"
  | "establecimientos"
  | "periodos-academicos"
  | "periodos-evaluacion"

interface ReportInput {
  format: ExportFormat
  /** Los mismos filtros que la tabla; vacío significa "sin filtrar" = todo. */
  filters?: unknown
  /** El orden de la tabla, si se quiere respetar en el reporte. */
  sorting?: unknown
}

const ETIQUETA_FORMATO: Record<ExportFormat, string> = {
  pdf: "PDF",
  excel: "Excel",
}

/**
 * Pide el reporte, dispara la descarga y devuelve el mismo
 * `{ status, message }` que ya consumen los diálogos de exportación. Mantener
 * esa forma es deliberado: los diálogos no cambian, solo cambia de dónde sale
 * el archivo.
 */
export async function downloadReport(
  key: ReportKey,
  { format, filters, sorting }: ReportInput,
): Promise<ExportResult> {
  try {
    // El genérico explícito NO es decorativo: `api-client` tiene un
    // `declare module "axios"` que retipa AxiosInstance.post como
    // `Promise<T>` porque SU interceptor desenvuelve `response.data`. Esa
    // augmentación es global y alcanza también a esta instancia, que no
    // desenvuelve nada — así que sin el genérico el resultado quedaba
    // `unknown`. Pidiendo `AxiosResponse<Blob>` el tipo vuelve a coincidir
    // con lo que realmente llega en runtime.
    const response = await reportApi.post<AxiosResponse<Blob>>(`/reportes/${key}`, {
      format,
      filters,
      sorting,
    })

    const blob = response.data as Blob
    const filas = Number(response.headers["x-report-rows"])
    const nombre =
      filenameFromContentDisposition(response.headers["content-disposition"]) ??
      `${key}.${format === "pdf" ? "pdf" : "xlsx"}`

    saveBlob(blob, nombre)

    if (Number.isFinite(filas) && filas === 0) {
      // Se descarga igual —el archivo es válido y sirve como constancia de que
      // el filtro no encontró nada—, pero se avisa, porque un archivo vacío
      // que aparece sin explicación se lee como un error del sistema.
      return { status: "ok", message: "No hay registros que coincidan con los filtros." }
    }

    const cuantos = Number.isFinite(filas) ? `${filas} registro(s)` : "El listado"
    return { status: "ok", message: `${cuantos} exportado(s) a ${ETIQUETA_FORMATO[format]}.` }
  } catch (error) {
    return {
      status: "error",
      message: await messageFromBlobError(error, "No se pudo generar el reporte."),
    }
  }
}
