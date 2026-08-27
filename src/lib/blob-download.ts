import Axios from "axios"

import { cleanErrorMessage } from "@/lib/api-client"

/**
 * Maquinaria compartida para descargar binarios autenticados.
 *
 * Existe porque los endpoints que sirven archivos —`/api/reportes/**` y
 * `/api/files/download/{id}`— exigen `Authorization: Bearer` en la cabecera, y
 * eso un `<a href>` o un `<img src>` del navegador no lo puede mandar. La
 * única vía es pedirlo con XHR/fetch, quedarse con el `Blob` y disparar la
 * descarga desde un object URL.
 *
 * Lo usan `report-client.ts` (exportaciones a PDF/Excel) y `files.ts`
 * (documentos institucionales). Vivía duplicado en el primero.
 */

/** `attachment; filename="x.pdf"; filename*=UTF-8''x.pdf` → `x.pdf`. */
export function filenameFromContentDisposition(contentDisposition: unknown): string | null {
  if (typeof contentDisposition !== "string") return null

  // Se prueba primero `filename*` (RFC 6266), que es el que conserva las
  // tildes; `filename` a secas es el fallback para clientes viejos.
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      // Un `filename*` mal formado no debería costarnos la descarga entera.
    }
  }

  const simple = /filename="?([^";]+)"?/i.exec(contentDisposition)
  return simple?.[1] ?? null
}

export function saveBlob(blob: Blob, nombre: string) {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement("a")
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()

  // El revoke va DIFERIDO, no en la misma vuelta del event loop. `.click()`
  // solo encola la descarga: el navegador todavía no leyó el blob. Revocar el
  // object URL inmediatamente después le saca el contenido de abajo y la
  // descarga se cancela en silencio — sin error, sin archivo, y con el aviso
  // de éxito igual en pantalla. Revocarlo hace falta (si no, el blob queda
  // retenido hasta cerrar la pestaña), pero después de que la descarga arrancó.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Con `responseType: "blob"` el cuerpo de error también llega como Blob, así
 * que el `{ message }` del backend hay que leerlo del texto. Sin esto, todos
 * los errores se verían como "[object Blob]".
 *
 * `fallback` lo pone cada caller porque el mensaje genérico depende del
 * contexto ("no se pudo generar el reporte" vs "no se pudo descargar el
 * documento").
 */
export async function messageFromBlobError(error: unknown, fallback: string): Promise<string> {
  const respuesta = Axios.isAxiosError(error) ? error.response : undefined
  const cuerpo = respuesta?.data

  if (cuerpo instanceof Blob) {
    try {
      const texto = await cuerpo.text()
      const json = JSON.parse(texto) as { message?: string; detail?: string }
      const mensaje = json.message ?? json.detail
      if (mensaje) return cleanErrorMessage(mensaje)
    } catch {
      // No era JSON: se cae al mensaje genérico del caller.
    }
  }

  return fallback
}
