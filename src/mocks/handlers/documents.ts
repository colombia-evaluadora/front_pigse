import { delay, http, HttpResponse } from "msw"

import { complianceFilesById } from "@/mocks/db/compliance"

import {
  documentsDb,
  documentCategoriesDb,
  listDocumentCategories,
  stageDocumentFile,
  saveDocumentAnnexesBatch,
} from "@/mocks/db/documents"
import {
  documentDeadlineError,
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
function findFileByArchivoId(
  archivoId: string | undefined,
): { fileName: string | null } | undefined {
  return (
    documentsDb.find((d) => String(d.archivoId) === String(archivoId)) ??
    documentCategoriesDb.find((c) => String(c.archivoId) === String(archivoId)) ??
    // Archivos de los EE del tablero de Monitoreo (otro mock, mismo binario).
    complianceFilesById.get(Number(archivoId))
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
   * Paso 1 del guardado "todo o nada" (V555.5): sube UN archivo de un anexo
   * SIN enlazarlo (`fn_documento_archivo_preparar`). Mismas validaciones de
   * tipo/categoría y fecha límite que el backend real.
   *
   * OJO con la ruta: el front antepone `/files` (file-service se pone en el
   * medio en el backend real), así que la URL es `/api/files/documents/files`.
   */
  http.post("*/api/files/documents/files", async ({ request }) => {
    await delay(600)

    const { tipo, archivo, categoria } = await readUploadBody(request)

    if (!tipo || !isDocumentType(tipo)) {
      return HttpResponse.json(
        { message: "Debe indicar el tipo de documento (PEI, PEC, PMI o PFI)." },
        { status: 400 },
      )
    }
    if (!archivo || archivo.size === 0) {
      return HttpResponse.json({ message: "Debe adjuntar un archivo no vacío." }, { status: 400 })
    }
    if (
      !categoria ||
      !isDocumentCategoryCode(categoria) ||
      !documentCategoriesForType(tipo).includes(categoria)
    ) {
      return HttpResponse.json(
        { message: `${tipo} no admite la categoría ${categoria ?? "(vacía)"}.` },
        { status: 400 },
      )
    }
    const deadlineError = documentDeadlineError()
    if (deadlineError) {
      return HttpResponse.json({ message: deadlineError }, { status: 409 })
    }
    // Para probar el fallo parcial: un archivo cuyo nombre contenga
    // "falla" se rechaza como lo haría file-service con un archivo dañado.
    if (archivo.name.toLowerCase().includes("falla")) {
      return HttpResponse.json({ message: "El archivo no se pudo procesar." }, { status: 400 })
    }

    return HttpResponse.json(stageDocumentFile({ fileName: archivo.name, sizeBytes: archivo.size }))
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
   * Paso 2 (V555.5, `fn_documento_guardar_lote`): enlaza TODOS los anexos de
   * un documento a la vez. Rechaza sin escribir nada si al terminar falta un
   * anexo obligatorio, igual que el backend real.
   */
  http.put("*/api/documents/:type/annexes", async ({ params, request }) => {
    await delay(400)

    const typeParam = Array.isArray(params.type) ? params.type[0] : params.type
    if (!typeParam || !isDocumentType(typeParam)) {
      return HttpResponse.json({ message: "Tipo de documento inválido." }, { status: 400 })
    }
    const deadlineError = documentDeadlineError()
    if (deadlineError) {
      return HttpResponse.json({ message: deadlineError }, { status: 409 })
    }

    const body = (await request.json().catch(() => null)) as {
      ANEXOS?: { categoria: string; archivoId: number }[]
      QUITAR?: number[]
    } | null

    const result = saveDocumentAnnexesBatch({
      type: typeParam,
      anexos: body?.ANEXOS ?? [],
      quitar: body?.QUITAR ?? [],
    })
    if ("error" in result) {
      return HttpResponse.json({ message: result.error }, { status: result.status })
    }
    return HttpResponse.json(result.rows)
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
