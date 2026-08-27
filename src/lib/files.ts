import Axios, { type AxiosResponse } from "axios"

import { api, authRequestInterceptor } from "@/lib/api-client"
import { filenameFromContentDisposition, messageFromBlobError, saveBlob } from "@/lib/blob-download"

/**
 * Subida y visualización de archivos vía `file-service`.
 *
 * **Cómo se manda.** No se sube el archivo por separado: se manda el mismo
 * payload de siempre, pero como `multipart/form-data` y contra el prefijo
 * `/files`. `file-service` se pone en el medio, guarda el binario en S3, lo
 * registra en `TARCHIVO` con la clasificación que declara `param_types`,
 * **reemplaza el campo por el `pk_tarchivo` resultante** y reenvía el JSON al
 * destino real (query-service o auth-center) con el mismo JWT. Para el front
 * es el mismo endpoint de siempre con otra envoltura.
 *
 * Dos formas de destino, y la diferencia importa en la URL:
 *   - destino `query`    → lleva prefijo de microservicio: `/files/eval-col/...`
 *   - destino `endpoint` → NO lo lleva:                    `/files/register/...`
 *
 * **Cómo se ve.** Un `<img src>` no puede mandar `Authorization`, así que la
 * imagen no se pide directo: primero se acuña (autenticado) un token de un solo
 * archivo y vida corta, y la URL que devuelve ya trae ese token. Ver
 * `fetchArchivoViewUrl`.
 */

/**
 * Aplana el payload a las claves con punto que espera `file-service`
 * (`basicInfo.name`, `address.municipality`), que es como viaja un objeto
 * anidado dentro de un form-data.
 *
 * Los `null`/`undefined` se omiten en vez de mandarse como la cadena "null":
 * en un form-data todo es texto, y "null" no es lo mismo que ausente — para un
 * PATCH parcial la diferencia es entre "no toques este campo" y "ponelo en
 * null".
 */
function appendFlattened(form: FormData, value: unknown, prefix = ""): void {
  if (value === null || value === undefined) return

  if (value instanceof File || value instanceof Blob) {
    form.append(prefix, value)
    return
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => appendFlattened(form, item, `${prefix}[${index}]`))
    return
  }

  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      appendFlattened(form, child, prefix ? `${prefix}.${key}` : key)
    }
    return
  }

  form.append(prefix, String(value))
}

/**
 * `data` aplanado + los archivos bajo el nombre EXACTO que declara el catálogo
 * (`logo` para el escudo, `fkTarchivoFoto` para la foto de perfil). Un campo
 * binario con otro nombre lo rechaza `file-service` con 400 antes de tocar S3
 * — la validación es por nombre, no por contenido.
 *
 * Un archivo ausente (`null`) simplemente no se agrega: los tres destinos lo
 * tratan como opcional y dejan el registro sin imagen.
 */
export function toMultipart(
  data: unknown,
  files: Record<string, File | null | undefined>,
): FormData {
  const form = new FormData()
  appendFlattened(form, data)
  for (const [field, file] of Object.entries(files)) {
    if (file) form.append(field, file)
  }
  return form
}

/**
 * No se fija `Content-Type` a mano: el navegador lo arma con el `boundary`
 * del multipart, y ponerlo explícito lo rompe.
 */
export function postMultipart<T>(
  path: string,
  data: unknown,
  files: Record<string, File | null | undefined>,
): Promise<T> {
  return api.post(`/files${path}`, toMultipart(data, files)) as Promise<T>
}

export function patchMultipart<T>(
  path: string,
  data: unknown,
  files: Record<string, File | null | undefined>,
): Promise<T> {
  return api.patch(`/files${path}`, toMultipart(data, files)) as Promise<T>
}

/** Lo que devuelve `POST /files/view-token/{id}`. */
export interface ArchivoViewToken {
  token: string
  /** Ruta ya lista para un `<img src>`: `/api/files/view/<id>?token=...` */
  url: string
}

/**
 * Acuña un token de vista para un archivo. El token vale para ESE archivo y
 * dura pocos minutos, así que la URL no se puede cachear indefinidamente —
 * ver `useArchivoViewUrl`, que la revalida antes de que expire.
 *
 * La `url` que vuelve es absoluta desde la raíz (`/api/...`), no relativa al
 * `baseURL` del cliente: va directo al `src` de la imagen, sin concatenar.
 */
export function fetchArchivoViewUrl(archivoId: number): Promise<ArchivoViewToken> {
  return api.post(`/files/view-token/${archivoId}`) as Promise<ArchivoViewToken>
}

/**
 * Instancia propia para bajar binarios del file-service.
 *
 * Dos motivos por los que no puede ser la `api` de siempre:
 *
 * 1. **Sin `baseURL`.** El `downloadUrl` que manda el backend ya viene
 *    absoluto desde la raíz (`/api/files/download/490033`). Pasarlo por una
 *    instancia con `baseURL: "/api"` daría `/api/api/files/...`.
 * 2. **`responseType: "blob"` + cabeceras.** El interceptor de `api`
 *    desenvuelve `response.data`, y ahí se pierde el `Content-Disposition`
 *    que trae el nombre real del archivo.
 *
 * Mismo patrón que `report-client.ts`, que baja los PDF/Excel de reportes.
 */
const fileApi = Axios.create({ responseType: "blob" })
fileApi.interceptors.request.use(authRequestInterceptor)

/**
 * Descarga el binario de un archivo y dispara el "guardar como" del navegador.
 *
 * **Por qué no es un `<a href={downloadUrl} download>`:** el endpoint
 * `GET /files/download/{id}` exige `Authorization: Bearer` (lo documenta el
 * propio `DownloadController` del file-service), y un `<a>` plano no puede
 * mandar cabeceras. Por eso se pide con XHR, se toma el `Blob` y se guarda
 * desde un object URL.
 *
 * El nombre sale del `Content-Disposition` de la respuesta; si el backend no
 * lo manda se cae al `fileName` de la fila del documento.
 *
 * @param downloadUrl Ruta absoluta que devuelve el backend en el campo
 *   `downloadUrl` de la fila (`/api/files/download/{archivoId}`).
 * @param fallbackName Nombre a usar si la respuesta no trae `Content-Disposition`.
 */
/**
 * Trae el binario de un archivo, ya autenticado, sin guardarlo.
 *
 * Es la pieza compartida entre "descargar" y "previsualizar": los dos
 * necesitan los MISMOS bytes, y lo único que cambia es qué se hace después
 * (dispararle un "guardar como" o meterlo en un `<object>`). Separarlo
 * permite que el visor cachee el Blob y que la descarga posterior no vuelva a
 * pedirlo a la red.
 *
 * Devuelve también el nombre real que mandó el backend en
 * `Content-Disposition`, que es más confiable que el `fileName` de la fila.
 */
export async function fetchArchivoBlob(
  downloadUrl: string,
): Promise<{ blob: Blob; fileName: string | null }> {
  try {
    // El genérico explícito NO es decorativo: `api-client` tiene un
    // `declare module "axios"` que retipa AxiosInstance.get como `Promise<T>`
    // porque SU interceptor desenvuelve `response.data`. Esa augmentación es
    // global y alcanza también a esta instancia, que no desenvuelve nada.
    // Mismo truco que en `report-client.ts`.
    const response = await fileApi.get<AxiosResponse<Blob>>(downloadUrl)
    return {
      blob: response.data as Blob,
      fileName: filenameFromContentDisposition(response.headers["content-disposition"]),
    }
  } catch (error) {
    throw new Error(await messageFromBlobError(error, "No se pudo obtener el documento."))
  }
}

/**
 * Descarga el binario y dispara el "guardar como" del navegador.
 *
 * **Por qué no es un `<a href={downloadUrl} download>`:** el endpoint
 * `GET /files/download/{id}` exige `Authorization: Bearer` (lo documenta el
 * propio `DownloadController` del file-service), y un `<a>` plano no puede
 * mandar cabeceras.
 *
 * Acepta un `blob` ya en mano para el caso en que el visor lo tenga cacheado:
 * ahí el botón de descargar no vuelve a pegarle a la red.
 */
export async function downloadArchivo(
  downloadUrl: string,
  fallbackName: string,
  cached?: Blob,
): Promise<void> {
  if (cached) {
    saveBlob(cached, fallbackName)
    return
  }
  const { blob, fileName } = await fetchArchivoBlob(downloadUrl)
  saveBlob(blob, fileName ?? fallbackName)
}
