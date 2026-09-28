import type {
  Document,
  DocumentCategory,
  DocumentCategoryCode,
  DocumentType,
} from "@/features/document-management/api/types/document"
import { DOCUMENT_CATEGORIES, documentCategoryDisplayName } from "@/features/document-management/api/types/document"

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
 * Estado inicial del mock (V512): "IE Denzil Educativa" es un establecimiento
 * regular (`etnias = 'N'`), así que entrega PEI y su PEC NO_APLICA — misma
 * regla excluyente de siempre. PEI y PMI ya NO cuelgan de un archivo propio
 * en la fila principal: PEI reporta su avance de anexos (`completedCategories`/
 * `totalCategories`, ver `documentCategoriesDb` más abajo); PMI sigue siendo
 * un solo archivo, sin cambios.
 */
const initialDocuments: Document[] = [
  {
    id: "PEI",
    type: "PEI",
    typeName: "Proyecto Educativo Institucional (PEI)",
    status: "PENDIENTE",
    fileName: null,
    uploadedAt: null,
    sizeBytes: null,
    archivoId: null,
    downloadUrl: null,
    completedCategories: 0,
    totalCategories: DOCUMENT_CATEGORIES.length,
  },
  {
    id: "PEC",
    type: "PEC",
    typeName: "Proyecto Educativo Comunitario (PEC)",
    status: "NO_APLICA",
    fileName: null,
    uploadedAt: null,
    sizeBytes: null,
    archivoId: null,
    downloadUrl: null,
    completedCategories: null,
    totalCategories: null,
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
 * Anexos de PEI/PEC (V512): una fila por (tipo, categoría) — solo PEI y PEC
 * tienen filas acá, PMI nunca. Sembrado con "Plan de estudios" ya cargado
 * para que el estado "3/5" (o el que sea) se vea desde el arranque sin
 * tener que subir nada primero.
 */
export const documentCategoriesDb: DocumentCategory[] = DOCUMENT_CATEGORIES.map((categoria) => ({
  id: categoria,
  type: "PEI",
  typeName: "Proyecto Educativo Institucional (PEI)",
  categoria,
  categoriaName: documentCategoryDisplayName(categoria),
  status: categoria === "PLAN_ESTUDIOS" ? "COMPLETO" : "PENDIENTE",
  fileName: categoria === "PLAN_ESTUDIOS" ? `${ESTABLISHMENT_SLUG}_PEI_PLAN_ESTUDIOS_2026.pdf` : null,
  uploadedAt: categoria === "PLAN_ESTUDIOS" ? "2026-02-14T10:30:00.000Z" : null,
  sizeBytes: categoria === "PLAN_ESTUDIOS" ? 1_842_336 : null,
  archivoId: categoria === "PLAN_ESTUDIOS" ? 490_033 : null,
  downloadUrl: categoria === "PLAN_ESTUDIOS" ? "/api/files/download/490033" : null,
}))

function recalcDocumentProgress(type: DocumentType): void {
  if (type === "PMI") return
  const rows = documentCategoriesDb.filter((c) => c.type === type)
  const completed = rows.filter((c) => c.fileName !== null).length
  const document = documentsDb.find((d) => d.type === type)
  if (!document || document.status === "NO_APLICA") return
  document.completedCategories = completed
  document.totalCategories = rows.length
  document.status = completed === rows.length ? "COMPLETO" : "PENDIENTE"
}
recalcDocumentProgress("PEI")

export function findDocumentByType(type: DocumentType): Document | undefined {
  return documentsDb.find((document) => document.type === type)
}

export function findDocumentCategory(
  type: DocumentType,
  categoria: DocumentCategoryCode,
): DocumentCategory | undefined {
  return documentCategoriesDb.find((c) => c.type === type && c.categoria === categoria)
}

export function listDocumentCategories(type: DocumentType): DocumentCategory[] {
  return documentCategoriesDb.filter((c) => c.type === type)
}

/** Ids sintéticos para los archivos que se suben en modo mock. */
let archivoIdSeq = 490_100
function nextArchivoId(): number {
  archivoIdSeq += 1
  return archivoIdSeq
}

/**
 * Carga (o reemplaza) la versión vigente de PMI — el único tipo que sigue
 * siendo un solo archivo. No se valida tipo mime ni tamaño — eso lo hace
 * `DialogUploadDocument` en el cliente antes de mandar la petición.
 */
export function uploadDocumentVersion(params: {
  type: "PMI"
  fileName: string
  sizeBytes: number
}): Document {
  const existing = findDocumentByType(params.type)
  const uploadedAt = new Date().toISOString()
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

export function deleteCurrentDocumentVersion(type: "PMI"): Document | undefined {
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

/** Carga (o reemplaza) el archivo vigente de UN anexo de PEI/PEC. */
export function uploadDocumentCategoryVersion(params: {
  type: DocumentType
  categoria: DocumentCategoryCode
  fileName: string
  sizeBytes: number
}): DocumentCategory {
  const existing = findDocumentCategory(params.type, params.categoria)
  const uploadedAt = new Date().toISOString()
  const archivoId = nextArchivoId()

  const next: DocumentCategory = {
    id: params.categoria,
    type: params.type,
    typeName: existing?.typeName ?? DOCUMENT_TYPES.find((t) => t.id === params.type)?.name ?? params.type,
    categoria: params.categoria,
    categoriaName: documentCategoryDisplayName(params.categoria),
    status: "COMPLETO",
    fileName: params.fileName,
    uploadedAt,
    sizeBytes: params.sizeBytes,
    archivoId,
    downloadUrl: `/api/files/download/${archivoId}`,
  }

  const index = documentCategoriesDb.findIndex(
    (c) => c.type === params.type && c.categoria === params.categoria,
  )
  if (index >= 0) {
    documentCategoriesDb[index] = next
  } else {
    documentCategoriesDb.push(next)
  }

  recalcDocumentProgress(params.type)
  return next
}

export function deleteDocumentCategoryVersion(
  type: DocumentType,
  categoria: DocumentCategoryCode,
): DocumentCategory | undefined {
  const existing = findDocumentCategory(type, categoria)
  if (!existing) return undefined

  const cleared: DocumentCategory = {
    ...existing,
    status: "PENDIENTE",
    fileName: null,
    uploadedAt: null,
    sizeBytes: null,
    archivoId: null,
    downloadUrl: null,
  }

  const index = documentCategoriesDb.findIndex((c) => c.type === type && c.categoria === categoria)
  if (index >= 0) {
    documentCategoriesDb[index] = cleared
  }

  recalcDocumentProgress(type)
  return cleared
}
