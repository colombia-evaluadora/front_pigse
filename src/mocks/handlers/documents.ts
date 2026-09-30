import { delay, http, HttpResponse } from "msw"

import {
  documentsDb,
  documentCategoriesDb,
  findDocumentCategory,
  findDocumentCategoryByArchivo,
  listDocumentCategories,
  uploadDocumentCategoryVersion,
  deleteDocumentCategoryVersion,
} from "@/mocks/db/documents"
import {
  getDocumentDeadline,
  setDocumentDeadline,
  saveDocumentDeadlineException,
  deleteDocumentDeadlineException,
} from "@/mocks/db/document-deadline"
import { establishmentsRowsDb } from "@/mocks/db/establishments"

import {
  DOCUMENT_CATEGORIES,
  documentCategoriesForType,
} from "@/features/document-management/api/types/document"
import type {
  DocumentCategoryCode,
  DocumentCategoryMutationResult,
  DocumentType,
} from "@/features/document-management/api/types/document"

const DOCUMENT_TYPE_SET: ReadonlySet<string> = new Set(["PEI", "PEC", "PMI", "PFI"])
const DOCUMENT_CATEGORY_SET: ReadonlySet<string> = new Set(DOCUMENT_CATEGORIES)

function isDocumentType(value: string): value is DocumentType {
  return DOCUMENT_TYPE_SET.has(value)
}

function isDocumentCategoryCode(value: string): value is DocumentCategoryCode {
  return DOCUMENT_CATEGORY_SET.has(value)
}

/**
 * `POST /documents/upload` — recibe el archivo vía `postMultipart`
 * (multipart/form-data). El campo del archivo viaja como `archivo`, el
 * tipo de documento como `tipo` (PEI/PEC/PMI/PFI) y la categoría del
 * anexo como `categoria`. `file-service` reemplaza el binario por un
 * `pk_tarchivo` antes de reenviar al query-service — en el mock
 * simulamos el contrato ya procesado: solo nos importa el nombre y el
 * peso del archivo.
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
 * Un `archivoId` siempre pertenece a un anexo (V521: los 4 tipos van por
 * categorías) — los handlers de archivo no necesitan saber de cuál, solo
 * el `fileName` para armar el PDF de prueba.
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
   * Lista los tipos de documento institucional (PEI/PEC/PMI/PFI, solo los
   * que aplican a este establecimiento) con su estado de entrega vigente.
   * No es paginado: el catálogo es cerrado y chico, igual que el resto de
   * los listados de tipo de documento del SSO. Ver
   * `fn_documentos_listar_vigentes` (backend real).
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
        { status: "error", message: "Debe indicar el tipo de documento (PEI, PEC, PMI o PFI)." },
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

    // V521: los 4 tipos exigen categoría -- mismas validaciones que
    // `fn_documento_guardar`.
    if (!categoria || !isDocumentCategoryCode(categoria)) {
      return HttpResponse.json(
        { status: "error", message: `Debe indicar la categoría del anexo de ${tipo}.` },
        { status: 400 },
      )
    }
    if (!documentCategoriesForType(tipo).includes(categoria)) {
      return HttpResponse.json(
        { status: "error", message: `${tipo} no admite la categoría ${categoria}.` },
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
   * Anexos de un tipo puntual (V521: los 4 tipos van por categorías) —
   * las categorías fijas que le corresponden (5 para PEI/PEC, 1 para
   * PMI/PFI) con su estado y archivo vigente (si lo hay).
   */
  http.get("*/api/documents/:type/categories", async ({ params }) => {
    await delay(200)

    const typeParam = Array.isArray(params.type) ? params.type[0] : params.type
    if (!typeParam || !isDocumentType(typeParam)) {
      return HttpResponse.json({ message: "Tipo de documento inválido." }, { status: 400 })
    }

    return HttpResponse.json({ rows: listDocumentCategories(typeParam) })
  }),

  /**
   * Elimina UN anexo. Baja lógica, el archivo pasa al historial. "Plan de
   * estudios" (V515, solo PEI/PEC) exige `ARCHIVOID` en el body -- admite
   * varios archivos, hay que decir cuál.
   */
  http.patch("*/api/documents/:type/categories/:categoria", async ({ params, request }) => {
    await delay(250)

    const typeParam = Array.isArray(params.type) ? params.type[0] : params.type
    const categoriaParam = Array.isArray(params.categoria) ? params.categoria[0] : params.categoria

    if (!typeParam || !isDocumentType(typeParam)) {
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

    const body = (await request.json().catch(() => null)) as { ARCHIVOID?: number | null } | null
    const archivoId = body?.ARCHIVOID ?? null

    if (categoriaParam === "PLAN_ESTUDIOS") {
      if (archivoId == null) {
        return HttpResponse.json(
          { status: "error", message: "Plan de estudios admite varios archivos -- indique cuál." },
          { status: 400 },
        )
      }
      const existing = findDocumentCategoryByArchivo(typeParam, categoriaParam, archivoId)
      if (!existing) {
        return HttpResponse.json(
          { status: "error", message: "Archivo no encontrado en Plan de estudios." },
          { status: 404 },
        )
      }
      const document = deleteDocumentCategoryVersion(typeParam, categoriaParam, archivoId)
      return HttpResponse.json<DocumentCategoryMutationResult>({
        status: "ok",
        message: "Anexo eliminado.",
        document: document!,
      })
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

  /**
   * Fecha límite global + excepciones activas (V522).
   */
  http.get("*/api/documents/deadline", async () => {
    await delay(150)
    return HttpResponse.json({ rows: [getDocumentDeadline()] })
  }),

  /**
   * Fija (o quita, con `FECHALIMITE: null`) la fecha límite global (V522).
   */
  http.patch("*/api/documents/deadline", async ({ request }) => {
    await delay(200)
    const body = (await request.json().catch(() => null)) as { FECHALIMITE?: string | null } | null
    const result = setDocumentDeadline(body?.FECHALIMITE ?? null)
    return HttpResponse.json({ rows: [result] })
  }),

  /**
   * Fija la fecha límite PROPIA de un establecimiento (V522) -- reemplaza
   * la global para él, no la suma.
   */
  http.put("*/api/documents/deadline/exceptions/:establecimiento", async ({ params, request }) => {
    await delay(200)
    const idParam = Array.isArray(params.establecimiento)
      ? params.establecimiento[0]
      : params.establecimiento
    const establecimientoId = Number(idParam)
    const establecimiento = establishmentsRowsDb.find((e) => e.id === establecimientoId)

    if (!establecimiento) {
      return HttpResponse.json({ message: "Establecimiento no encontrado." }, { status: 404 })
    }

    const body = (await request.json().catch(() => null)) as { FECHALIMITE?: string } | null
    if (!body?.FECHALIMITE) {
      return HttpResponse.json({ message: "Debe indicar la fecha límite." }, { status: 400 })
    }

    const result = saveDocumentDeadlineException(
      establecimientoId,
      establecimiento.name,
      body.FECHALIMITE,
    )
    return HttpResponse.json({ rows: [result] })
  }),

  /**
   * Saca la excepción de un establecimiento (V522) -- vuelve a regirse por
   * la fecha global.
   */
  http.patch("*/api/documents/deadline/exceptions/:establecimiento", async ({ params }) => {
    await delay(200)
    const idParam = Array.isArray(params.establecimiento)
      ? params.establecimiento[0]
      : params.establecimiento
    const establecimientoId = Number(idParam)

    const removed = deleteDocumentDeadlineException(establecimientoId)
    if (!removed) {
      return HttpResponse.json(
        { message: "Este establecimiento no tiene excepción activa." },
        { status: 404 },
      )
    }
    return HttpResponse.json({ rows: [{ establecimientoId }] })
  }),
]
