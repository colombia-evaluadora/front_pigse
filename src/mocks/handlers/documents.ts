import { delay, http, HttpResponse } from "msw"

import {
  documentsDb,
  documentCategoriesDb,
  findDocumentByType,
  findDocumentCategory,
  listDocumentCategories,
  uploadDocumentVersion,
  deleteCurrentDocumentVersion,
  uploadDocumentCategoryVersion,
  deleteDocumentCategoryVersion,
} from "@/mocks/db/documents"

import { DOCUMENT_CATEGORIES } from "@/features/document-management/api/types/document"
import type {
  DocumentCategoryCode,
  DocumentCategoryMutationResult,
  DocumentMutationResult,
  DocumentType,
} from "@/features/document-management/api/types/document"

const DOCUMENT_TYPE_SET: ReadonlySet<string> = new Set(["PEI", "PEC", "PMI"])
const DOCUMENT_CATEGORY_SET: ReadonlySet<string> = new Set(DOCUMENT_CATEGORIES)

function isDocumentType(value: string): value is DocumentType {
  return DOCUMENT_TYPE_SET.has(value)
}

function isDocumentCategoryCode(value: string): value is DocumentCategoryCode {
  return DOCUMENT_CATEGORY_SET.has(value)
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
    // V512: opcional a nivel de formulario — la validación de "obligatoria
    // para PEI/PEC" vive en el handler, igual que en `fn_documento_guardar`.
    const categoria = form.get("CATEGORIA") ?? form.get("categoria")
    return {
      tipo: typeof tipo === "string" ? tipo : null,
      archivo: archivo instanceof File ? archivo : null,
      categoria: typeof categoria === "string" && categoria ? categoria : null,
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

/**
 * Un `archivoId` puede pertenecer a un documento de un solo archivo (PMI) o
 * a un anexo de PEI/PEC (V512) — los handlers de archivo no necesitan saber
 * cuál, solo el `fileName` para armar el PDF de prueba.
 */
function findFileByArchivoId(archivoId: string | undefined): { fileName: string | null } | undefined {
  return (
    documentsDb.find((d) => String(d.archivoId) === String(archivoId)) ??
    documentCategoriesDb.find((c) => String(c.archivoId) === String(archivoId))
  )
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
    const documento = findFileByArchivoId(archivoId)

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
    const documento = findFileByArchivoId(archivoId)

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
    const documento = findFileByArchivoId(archivoId)

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

    const { tipo, archivo, categoria } = await readUploadBody(request)

    if (!tipo || !isDocumentType(tipo)) {
      return HttpResponse.json(
        { status: "error", message: "Debe indicar el tipo de documento (PEI, PEC o PMI)." },
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

    // V512: PEI/PEC exigen categoría (uno de los 5 anexos fijos); PMI no
    // tiene categorías — mismo par de validaciones que `fn_documento_guardar`.
    if (tipo === "PMI") {
      if (categoria) {
        return HttpResponse.json(
          { status: "error", message: "PMI no tiene categorías." },
          { status: 400 },
        )
      }
      const document = uploadDocumentVersion({
        type: "PMI",
        fileName: archivo.name,
        sizeBytes: archivo.size,
      })
      return HttpResponse.json<DocumentMutationResult>({
        status: "ok",
        message: "Documento cargado correctamente.",
        document,
      })
    }

    if (!categoria || !isDocumentCategoryCode(categoria)) {
      return HttpResponse.json(
        { status: "error", message: `Debe indicar la categoría del anexo de ${tipo}.` },
        { status: 400 },
      )
    }

    const document = uploadDocumentCategoryVersion({
      type: tipo,
      categoria,
      fileName: archivo.name,
      sizeBytes: archivo.size,
    })

    return HttpResponse.json<DocumentCategoryMutationResult>({
      status: "ok",
      message: "Anexo cargado correctamente.",
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

    // V512: PEI/PEC ya no se eliminan por acá (son 5 anexos, no un solo
    // archivo) — ver el handler de `/documents/:type/categories/:categoria`
    // más abajo. Esta ruta sigue existiendo solo para PMI.
    if (typeParam !== "PMI") {
      return HttpResponse.json(
        { status: "error", message: `${typeParam} requiere indicar la categoría del anexo a eliminar.` },
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

  /**
   * Anexos de un PEI/PEC puntual (V512) — las 5 categorías fijas con su
   * estado y archivo vigente (si lo hay).
   */
  http.get("*/api/documents/:type/categories", async ({ params }) => {
    await delay(200)

    const typeParam = Array.isArray(params.type) ? params.type[0] : params.type
    if (!typeParam || typeParam === "PMI" || !isDocumentType(typeParam)) {
      return HttpResponse.json({ message: "Tipo de documento inválido." }, { status: 400 })
    }

    return HttpResponse.json({ rows: listDocumentCategories(typeParam) })
  }),

  /**
   * Elimina la versión vigente de UN anexo de PEI/PEC. Mismo criterio que
   * el PATCH de arriba: baja lógica, el archivo pasa al historial.
   */
  http.patch("*/api/documents/:type/categories/:categoria", async ({ params }) => {
    await delay(250)

    const typeParam = Array.isArray(params.type) ? params.type[0] : params.type
    const categoriaParam = Array.isArray(params.categoria) ? params.categoria[0] : params.categoria

    if (!typeParam || typeParam === "PMI" || !isDocumentType(typeParam)) {
      return HttpResponse.json(
        { status: "error", message: "Tipo de documento inválido." },
        { status: 400 },
      )
    }
    if (!categoriaParam || !isDocumentCategoryCode(categoriaParam)) {
      return HttpResponse.json(
        { status: "error", message: "Categoría inválida." },
        { status: 400 },
      )
    }

    const existing = findDocumentCategory(typeParam, categoriaParam)
    if (!existing || existing.status === "PENDIENTE") {
      return HttpResponse.json(
        { status: "error", message: "El anexo no tiene una versión vigente para eliminar." },
        { status: 404 },
      )
    }

    const document = deleteDocumentCategoryVersion(typeParam, categoriaParam)
    if (!document) {
      return HttpResponse.json(
        { status: "error", message: "No se pudo eliminar el anexo." },
        { status: 500 },
      )
    }
    return HttpResponse.json<DocumentCategoryMutationResult>({
      status: "ok",
      message: "Anexo eliminado.",
      document,
    })
  }),
]
