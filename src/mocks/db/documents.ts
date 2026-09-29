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

/** Ids sintéticos para los archivos que se suben en modo mock. */
let archivoIdSeq = 490_100
function nextArchivoId(): number {
  archivoIdSeq += 1
  return archivoIdSeq
}

/**
 * Anexos de PEI/PEC: una fila por archivo. Para las 4 categorías de un solo
 * archivo (SIEE, Manual de convivencia, Proyectos transversales, Plan de
 * gestión del riesgo) hay a lo sumo 1 fila por (tipo, categoría), `id` =
 * categoría. "Plan de estudios" (V515) admite VARIAS filas activas a la vez
 * -- ahí `id` es el `archivoId` (como texto), porque puede haber más de una.
 *
 * Sembrado con "Plan de estudios" ya con un archivo cargado, para ver el
 * avance parcial ("1/5" o el que sea) desde el arranque sin subir nada
 * primero.
 */
const seedPlanEstudiosArchivoId = nextArchivoId()
export const documentCategoriesDb: DocumentCategory[] = [
  {
    id: String(seedPlanEstudiosArchivoId),
    type: "PEI",
    typeName: "Proyecto Educativo Institucional (PEI)",
    categoria: "PLAN_ESTUDIOS",
    categoriaName: documentCategoryDisplayName("PLAN_ESTUDIOS"),
    status: "COMPLETO",
    fileName: `${ESTABLISHMENT_SLUG}_PEI_PLAN_ESTUDIOS_2026.pdf`,
    uploadedAt: "2026-02-14T10:30:00.000Z",
    sizeBytes: 1_842_336,
    archivoId: seedPlanEstudiosArchivoId,
    downloadUrl: `/api/files/download/${seedPlanEstudiosArchivoId}`,
  },
  ...DOCUMENT_CATEGORIES.filter((categoria) => categoria !== "PLAN_ESTUDIOS").map(
    (categoria): DocumentCategory => ({
      id: categoria,
      type: "PEI",
      typeName: "Proyecto Educativo Institucional (PEI)",
      categoria,
      categoriaName: documentCategoryDisplayName(categoria),
      status: "PENDIENTE",
      fileName: null,
      uploadedAt: null,
      sizeBytes: null,
      archivoId: null,
      downloadUrl: null,
    }),
  ),
]

/**
 * "Completa" = al menos 1 archivo, contando por CATEGORÍA (no por fila --
 * "Plan de estudios" con 3 archivos sigue contando 1 de 5, no 3 de 5).
 */
function recalcDocumentProgress(type: DocumentType): void {
  if (type === "PMI") return
  const rows = documentCategoriesDb.filter((c) => c.type === type)
  const completedCategorias = new Set(
    rows.filter((c) => c.fileName !== null).map((c) => c.categoria),
  )
  const document = documentsDb.find((d) => d.type === type)
  if (!document || document.status === "NO_APLICA") return
  document.completedCategories = completedCategorias.size
  document.totalCategories = DOCUMENT_CATEGORIES.length
  document.status = completedCategorias.size === DOCUMENT_CATEGORIES.length ? "COMPLETO" : "PENDIENTE"
}
recalcDocumentProgress("PEI")

export function findDocumentByType(type: DocumentType): Document | undefined {
  return documentsDb.find((document) => document.type === type)
}

/**
 * Fila ÚNICA de una categoría de un solo archivo (nunca "Plan de estudios",
 * que puede tener varias -- ahí hay que buscar por `archivoId` puntual, no
 * por `type`+`categoria`).
 */
export function findDocumentCategory(
  type: DocumentType,
  categoria: DocumentCategoryCode,
): DocumentCategory | undefined {
  return documentCategoriesDb.find((c) => c.type === type && c.categoria === categoria)
}

export function findDocumentCategoryByArchivo(
  type: DocumentType,
  categoria: DocumentCategoryCode,
  archivoId: number,
): DocumentCategory | undefined {
  return documentCategoriesDb.find(
    (c) => c.type === type && c.categoria === categoria && c.archivoId === archivoId,
  )
}

/**
 * Todas las filas de un tipo. "Plan de estudios" sin ningún archivo activo
 * agrega una fila PENDIENTE placeholder (mismo criterio que el backend real,
 * V515) para que la categoría siga apareciendo en la pantalla aunque
 * todavía no tenga nada cargado.
 */
export function listDocumentCategories(type: DocumentType): DocumentCategory[] {
  const rows = documentCategoriesDb.filter((c) => c.type === type)
  const tienePlanEstudios = rows.some((c) => c.categoria === "PLAN_ESTUDIOS")
  if (tienePlanEstudios) return rows

  const document = findDocumentByType(type)
  const noAplica = document?.status === "NO_APLICA"
  const placeholder: DocumentCategory = {
    id: "PLAN_ESTUDIOS",
    type,
    typeName: document?.typeName ?? type,
    categoria: "PLAN_ESTUDIOS",
    categoriaName: documentCategoryDisplayName("PLAN_ESTUDIOS"),
    status: noAplica ? "NO_APLICA" : "PENDIENTE",
    fileName: null,
    uploadedAt: null,
    sizeBytes: null,
    archivoId: null,
    downloadUrl: null,
  }
  return [...rows, placeholder]
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

/**
 * Carga el archivo de UN anexo de PEI/PEC. "Plan de estudios" (V515)
 * SIEMPRE agrega una fila nueva (nunca reemplaza -- admite varios archivos
 * a la vez); las demás categorías siguen reemplazando la única fila
 * vigente, como en V512.
 */
export function uploadDocumentCategoryVersion(params: {
  type: DocumentType
  categoria: DocumentCategoryCode
  fileName: string
  sizeBytes: number
}): DocumentCategory {
  const uploadedAt = new Date().toISOString()
  const archivoId = nextArchivoId()
  const typeName =
    documentCategoriesDb.find((c) => c.type === params.type)?.typeName ??
    DOCUMENT_TYPES.find((t) => t.id === params.type)?.name ??
    params.type

  if (params.categoria === "PLAN_ESTUDIOS") {
    const next: DocumentCategory = {
      id: String(archivoId),
      type: params.type,
      typeName,
      categoria: params.categoria,
      categoriaName: documentCategoryDisplayName(params.categoria),
      status: "COMPLETO",
      fileName: params.fileName,
      uploadedAt,
      sizeBytes: params.sizeBytes,
      archivoId,
      downloadUrl: `/api/files/download/${archivoId}`,
    }
    documentCategoriesDb.push(next)
    recalcDocumentProgress(params.type)
    return next
  }

  const existing = findDocumentCategory(params.type, params.categoria)
  const next: DocumentCategory = {
    id: params.categoria,
    type: params.type,
    typeName: existing?.typeName ?? typeName,
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

/**
 * Da de baja un anexo. "Plan de estudios" (V515) identifica CUÁL de los
 * varios archivos por `archivoId` y lo saca de la lista del todo (no
 * "vuelve a PENDIENTE" como las categorías de un solo archivo -- deja de
 * existir esa fila puntual). Las demás categorías siguen limpiando la
 * única fila vigente, como en V512.
 */
export function deleteDocumentCategoryVersion(
  type: DocumentType,
  categoria: DocumentCategoryCode,
  archivoId?: number | null,
): DocumentCategory | undefined {
  if (categoria === "PLAN_ESTUDIOS") {
    if (archivoId == null) return undefined
    const existing = findDocumentCategoryByArchivo(type, categoria, archivoId)
    if (!existing) return undefined

    const index = documentCategoriesDb.findIndex(
      (c) => c.type === type && c.categoria === categoria && c.archivoId === archivoId,
    )
    if (index >= 0) documentCategoriesDb.splice(index, 1)

    recalcDocumentProgress(type)
    return { ...existing, status: "PENDIENTE", fileName: null, archivoId: null, downloadUrl: null }
  }

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
