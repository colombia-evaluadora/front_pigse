import type { Document, DocumentType } from "@/features/document-management/api/types/document"

/**
 * Catálogo cerrado de los tipos de documento institucional que el
 * establecimiento educativo puede cargar acá: PEI, PEC y PMI. El backend
 * real lo registraría como catálogo (`TLISTA_VALOR`); en el mock vive acá
 * porque la página solo expone estas filas y no se listan desde ningún
 * endpoint remoto.
 *
 * El `id` es el discriminador: el endpoint de detalle/carga lo recibe y
 * resuelve contra estas filas —no contra un id autonumérico de base— para
 * mantener el contrato chico (tres documentos por EE).
 */
interface DocumentTypeDefinition {
  id: DocumentType
  name: string
  shortName: string
}

export const DOCUMENT_TYPES: DocumentTypeDefinition[] = [
  {
    id: "PEI",
    name: "Proyecto Educativo Institucional (PEI)",
    shortName: "PEI",
  },
  {
    id: "PEC",
    name: "Proyecto Educativo Comunitario (PEC)",
    shortName: "PEC",
  },
  {
    id: "PMI",
    name: "Plan de Mejoramiento Institucional (PMI)",
    shortName: "PMI",
  },
]

/**
 * Nombre del establecimiento con el que se arman los archivos de prueba
 * (lo que se ve en el popover "Denzil_Escolar_PEI_2026.pdf"). Se usa acá
 * para que el nombre del archivo vigente del PEI tenga consistencia entre
 * renders.
 */
const ESTABLISHMENT_SLUG = "Denzil_Escolar"

/**
 * Estado inicial del mock: PEI ya tiene una versión cargada (estado
 * COMPLETO), PEC y PMI todavía no (estado PENDIENTE). El nombre del
 * archivo semilla sigue el patrón `<slug>_<tipo>_<año>.pdf` para que
 * luzca realista y matchee el ejemplo del Figma.
 */
const initialDocuments: Document[] = [
  {
    id: "PEI",
    type: "PEI",
    typeName: "Proyecto Educativo Institucional (PEI)",
    status: "COMPLETO",
    fileName: `${ESTABLISHMENT_SLUG}_PEI_2026.pdf`,
    uploadedAt: "2026-02-14T10:30:00.000Z",
    sizeBytes: 1_842_336,
    archivoId: 490033,
    downloadUrl: "/api/files/download/490033",
  },
  {
    // "IE Denzil Educativa" es un establecimiento regular (`etnias = 'N'` en
    // TESTABLECIMIENTO), así que entrega PEI y su PEC NO APLICA. Es la regla
    // que aplica `fn_pigse_documentos_listar` en el backend, y el caso está
    // sembrado a propósito para poder ver el estado gris sin acción en dev:
    // PEI y PEC son excluyentes por modalidad, nunca están los dos pendientes.
    id: "PEC",
    type: "PEC",
    typeName: "Proyecto Educativo Comunitario (PEC)",
    status: "NO_APLICA",
    fileName: null,
    uploadedAt: null,
    sizeBytes: null,
    archivoId: null,
    downloadUrl: null,
  },
  {
    id: "PMI",
    type: "PMI",
    typeName: "Plan de Mejoramiento Institucional (PMI)",
    status: "PENDIENTE",
    fileName: null,
    uploadedAt: null,
    sizeBytes: null,
    archivoId: null,
    downloadUrl: null,
  },
]

/** Tabla en memoria: clave = id de tipo de documento (`PEI` | `PEC` | `PMI`). */
export const documentsDb: Document[] = [...initialDocuments]

/**
 * Devuelve el documento ACTUAL (la versión vigente) por tipo. Nunca devuelve
 * `undefined` mientras los ids del catálogo estén cerrados — los tres tipos
 * nacen sembrados — pero se deja tipado como opcional para no romper la
 * verificación de nulidad del caller.
 */
export function findDocumentByType(type: DocumentType): Document | undefined {
  return documentsDb.find((document) => document.type === type)
}

/**
 * Carga una nueva versión del documento: reemplaza la vigente en la fila
 * principal. No se valida tipo mime ni tamaño — eso lo hace
 * `DialogUploadDocument` en el cliente antes de mandar la petición. El
 * backend real lo haría en `file-service`, no en el query-service.
 */
/** Ids sintéticos para los archivos que se suben en modo mock. */
let archivoIdSeq = 490_100
function nextArchivoId(): number {
  archivoIdSeq += 1
  return archivoIdSeq
}

export function uploadDocumentVersion(params: {
  type: DocumentType
  fileName: string
  sizeBytes: number
}): Document {
  const existing = findDocumentByType(params.type)
  const uploadedAt = new Date().toISOString()
  // El backend real devuelve el `pk_tarchivo` que acaba de crear el
  // file-service. Acá se sintetiza uno para que la fila recién subida tenga
  // una descarga funcional, igual que las sembradas.
  const archivoId = nextArchivoId()

  const next: Document = {
    id: params.type,
    type: params.type,
    typeName:
      existing?.typeName ?? DOCUMENT_TYPES.find((t) => t.id === params.type)?.name ?? params.type,
    status: "COMPLETO",
    fileName: params.fileName,
    uploadedAt,
    sizeBytes: params.sizeBytes,
    archivoId,
    downloadUrl: `/api/files/download/${archivoId}`,
  }

  const index = documentsDb.findIndex((document) => document.type === params.type)
  if (index >= 0) {
    documentsDb[index] = next
  } else {
    documentsDb.push(next)
  }

  return next
}

/**
 * Elimina la versión vigente de un documento: el estado vuelve a
 * `PENDIENTE` y el archivo desaparece (no se mantiene historial de
 * versiones anteriores en este módulo).
 */
export function deleteCurrentDocumentVersion(type: DocumentType): Document | undefined {
  const existing = findDocumentByType(type)
  if (!existing) return undefined

  const cleared: Document = {
    ...existing,
    status: "PENDIENTE",
    fileName: null,
    uploadedAt: null,
    sizeBytes: null,
  }

  const index = documentsDb.findIndex((document) => document.type === type)
  if (index >= 0) {
    documentsDb[index] = cleared
  }

  return cleared
}
