import { delay, http, HttpResponse } from "msw"

import {
  documentsDb,
  findDocumentByType,
  uploadDocumentVersion,
  deleteCurrentDocumentVersion,
} from "@/mocks/db/documents"

import type { DocumentType } from "@/features/document-management/api/types/document"
import type { DocumentMutationResult } from "@/features/document-management/api/types/document"

const DOCUMENT_TYPE_SET: ReadonlySet<string> = new Set(["PEI", "PEC", "PMI"])

function isDocumentType(value: string): value is DocumentType {
  return DOCUMENT_TYPE_SET.has(value)
}

/**
 * `POST /documents/upload` — recibe el archivo vía `postMultipart`
 * (multipart/form-data). El campo del archivo viaja como `archivo` y el
 * tipo de documento como `tipo` ("PEI" | "PMI"). `file-service` reemplaza
 * el binario por un `pk_tarchivo` antes de reenviar al query-service — en
 * el mock simulamos el contrato ya procesado: solo nos importa el nombre
 * y el peso del archivo.
 */
async function readUploadBody(request: Request) {
  try {
    const form = await request.formData()
    // El backend real declara los campos en MAYÚSCULA (`BODY.TIPO`,
    // `BODY.ARCHIVO` en `query.param_types`). Se aceptan las dos grafías
    // para que el mock siga sirviendo a los tests viejos.
    const tipo = form.get("TIPO") ?? form.get("tipo")
    const archivo = form.get("ARCHIVO") ?? form.get("archivo")
    return {
      tipo: typeof tipo === "string" ? tipo : null,
      archivo: archivo instanceof File ? archivo : null,
    }
  } catch {
    return { tipo: null, archivo: null }
  }
}

/**
 * Arma un PDF de una página, válido de verdad.
 *
 * Los offsets de la tabla `xref` se calculan en runtime en vez de escribirlos
 * a mano: un offset corrido por un byte deja el archivo ilegible. Y hace falta
 * que sea válido de verdad porque el visor es pdf.js, bastante más estricto
 * que el visor nativo del navegador — un PDF sin `xref` correcto le hace tirar
 * `InvalidPDFException` en vez de mostrarlo.
 */
function buildMockPdf(texto: string): string {
  // Los paréntesis y la barra invertida delimitan y escapan strings en PDF:
  // dejarlos pasar rompería el objeto de contenido.
  // Se quitan los caracteres que en PDF delimitan o escapan un string:
  // los paréntesis y la barra invertida. La barra se compara por código en
  // vez de escribirla literal para no depender del escapado del archivo.
  const limpio = [...texto]
    .filter((c) => c !== "(" && c !== ")" && c !== String.fromCharCode(92))
    .join("")
  const contenido = `BT /F1 16 Tf 40 120 Td (${limpio}) Tj ET`

  const objetos = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 200] /Contents 4 0 R" +
      " /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${contenido.length} >>\nstream\n${contenido}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ]

  let pdf = "%PDF-1.4\n"
  const offsets: number[] = []
  objetos.forEach((cuerpo, indice) => {
    offsets.push(pdf.length)
    pdf += `${indice + 1} 0 obj\n${cuerpo}\nendobj\n`
  })

  const inicioXref = pdf.length
  pdf += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n`
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`
  }
  pdf += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\n`
  pdf += `startxref\n${inicioXref}\n%%EOF\n`
  return pdf
}

export const documentHandlers = [
  /**
   * Acuña el token de vista. El backend real devuelve `{ token, url }` donde
   * `url` ya viene lista para un `<img src>` / `<iframe src>` — con el token
   * en el query string, porque esas etiquetas no pueden mandar cabeceras.
   */
  http.post("*/api/files/view-token/:archivoId", async ({ params }) => {
    await delay(150)
    const archivoId = Array.isArray(params.archivoId) ? params.archivoId[0] : params.archivoId
    const documento = documentsDb.find((d) => String(d.archivoId) === String(archivoId))

    if (!documento?.fileName) {
      return HttpResponse.json({ message: "Archivo no encontrado." }, { status: 404 })
    }

    const token = `mock-view-${archivoId}`
    return HttpResponse.json({ token, url: `/api/files/view/${archivoId}?token=${token}` })
  }),

  /**
   * Sirve el binario INLINE (sin `Content-Disposition: attachment`), que es
   * lo que hace que el visor nativo del navegador lo muestre dentro del
   * `<iframe>` en vez de dispararle una descarga.
   */
  http.get("*/api/files/view/:archivoId", async ({ params }) => {
    await delay(200)
    const archivoId = Array.isArray(params.archivoId) ? params.archivoId[0] : params.archivoId
    const documento = documentsDb.find((d) => String(d.archivoId) === String(archivoId))

    if (!documento?.fileName) {
      return HttpResponse.json({ message: "Archivo no encontrado." }, { status: 404 })
    }

    return new HttpResponse(
      new Blob([buildMockPdf(documento.fileName)], { type: "application/pdf" }),
      {
        status: 200,
        headers: { "Content-Type": "application/pdf" },
      },
    )
  }),

  /**
   * Descarga del binario. En el mock no hay S3: se devuelve un PDF mínimo
   * pero VÁLIDO, para que el navegador dispare el "guardar como" de verdad y
   * el flujo se pueda probar entero (fetch -> blob -> object URL -> click).
   *
   * El `Content-Disposition` va a propósito: es de donde `downloadArchivo`
   * saca el nombre real del archivo.
   */
  http.get("*/api/files/download/:archivoId", async ({ params }) => {
    await delay(300)

    const archivoId = Array.isArray(params.archivoId) ? params.archivoId[0] : params.archivoId
    const documento = documentsDb.find((d) => String(d.archivoId) === String(archivoId))

    if (!documento?.fileName) {
      return HttpResponse.json({ message: "Archivo no encontrado." }, { status: 404 })
    }

    const pdf = new Blob([buildMockPdf(documento.fileName)], { type: "application/pdf" })
    return new HttpResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${documento.fileName}"`,
      },
    })
  }),

  /**
   * Lista los tipos de documento institucional (PEI, PEC, PMI) con su
   * estado de entrega vigente. No es paginado: el catálogo es cerrado y
   * chico, igual que el resto de los listados de tipo de documento del
   * SSO. Ver `fn_documentos_listar_vigentes` (backend real).
   */
  http.get("*/api/documents", async () => {
    await delay(200)
    return HttpResponse.json({ rows: documentsDb })
  }),

  /**
   * Carga (o reemplaza) la versión vigente de un documento. Devuelve el
   * `Document` ya actualizado.
   */
  // OJO con la ruta: `postMultipart` (lib/files.ts) antepone `/files` porque
  // en el backend real el file-service se pone en el medio para subir el
  // binario a S3 y registrarlo en TARCHIVO antes de reenviar al
  // query-service. Entonces la URL que sale del front es
  // `/api/files/documents/upload`, NO `/api/documents/upload` — con la
  // máscara sin `/files` el handler no matchea, MSW deja pasar el request
  // al proxy y la carga muere con un 401 del gateway real.
  http.post("*/api/files/documents/upload", async ({ request }) => {
    await delay(450)

    const { tipo, archivo } = await readUploadBody(request)

    if (!tipo || !isDocumentType(tipo)) {
      return HttpResponse.json(
        { status: "error", message: "Debe indicar el tipo de documento (PEI o PMI)." },
        { status: 400 },
      )
    }

    if (!archivo) {
      return HttpResponse.json(
        { status: "error", message: "Debe adjuntar el archivo del documento." },
        { status: 400 },
      )
    }

    if (archivo.size === 0) {
      return HttpResponse.json(
        { status: "error", message: "El archivo adjunto está vacío." },
        { status: 400 },
      )
    }

    const document = uploadDocumentVersion({
      type: tipo,
      fileName: archivo.name,
      sizeBytes: archivo.size,
    })

    return HttpResponse.json<DocumentMutationResult>({
      status: "ok",
      message: "Documento cargado correctamente.",
      document,
    })
  }),

  /**
   * Elimina la versión vigente de un documento. El archivo no se borra del
   * historial — pasa a "versiones anteriores" — y el estado vuelve a
   * PENDIENTE hasta que se suba uno nuevo.
   */
  http.patch("*/api/documents/:type", async ({ params }) => {
    await delay(250)

    const typeParam = Array.isArray(params.type) ? params.type[0] : params.type
    if (!typeParam || !isDocumentType(typeParam)) {
      return HttpResponse.json(
        { status: "error", message: "Tipo de documento inválido." },
        { status: 400 },
      )
    }

    const existing = findDocumentByType(typeParam)
    if (!existing || existing.status === "PENDIENTE") {
      return HttpResponse.json(
        { status: "error", message: "El documento no tiene una versión vigente para eliminar." },
        { status: 404 },
      )
    }

    const document = deleteCurrentDocumentVersion(typeParam)
    if (!document) {
      return HttpResponse.json(
        { status: "error", message: "No se pudo eliminar el documento." },
        { status: 500 },
      )
    }
    return HttpResponse.json<DocumentMutationResult>({
      status: "ok",
      message: "Documento eliminado.",
      document,
    })
  }),
]
