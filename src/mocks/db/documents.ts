import type {
  Document,
  DocumentCategory,
  DocumentCategoryCode,
  DocumentType,
} from "@/features/document-management/api/types/document"
import {
  documentCategoriesForType,
  requiredDocumentCategoriesForType,
  documentCategoryDisplayName,
} from "@/features/document-management/api/types/document"

/**
 * Catálogo cerrado de los tipos de documento institucional que el
 * establecimiento educativo puede cargar acá: PEI/PEC (proyecto
 * educativo) y PMI/PFI (plan de mejoramiento/fortalecimiento, V521) — el
 * backend real lo registraría como catálogo (`TLISTA_VALOR`); en el mock
 * vive acá porque la página solo expone estas filas y no se listan desde
 * ningún endpoint remoto.
 *
 * El `id` es el discriminador: el endpoint de detalle/carga lo recibe y
 * resuelve contra estas filas —no contra un id autonumérico de base— para
 * mantener el contrato chico.
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
  {
    id: "PFI",
    name: "Plan de Fortalecimiento Institucional (PFI)",
    shortName: "PFI",
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
 * Estado inicial del mock: "IE Denzil Educativa" es un establecimiento
 * regular (`etnias = 'N'`), así que entrega PEI + PMI — su PEC/PFI no
 * aplican y, desde V521, directamente NO aparecen acá (antes se veían
 * como fila NO_APLICA). Los 4 tipos van por categorías (V521): esta fila
 * solo reporta el avance (`completedCategories`/`totalCategories`,
 * ver `documentCategoriesDb` más abajo), el archivo real vive en cada
 * anexo.
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
    totalCategories: requiredDocumentCategoriesForType("PEI").length,
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
    completedCategories: 0,
    totalCategories: requiredDocumentCategoriesForType("PMI").length,
  },
]

/** Tabla en memoria: clave = id de tipo de documento (`PEI` | `PEC` | `PMI` | `PFI`). */
export const documentsDb: Document[] = [...initialDocuments]

/** Ids sintéticos para los archivos que se suben en modo mock. */
let archivoIdSeq = 490_100
function nextArchivoId(): number {
  archivoIdSeq += 1
  return archivoIdSeq
}

/**
 * Anexos de cada tipo: una fila por archivo. Para las categorías de un
 * solo archivo (todas menos "Plan de estudios") hay a lo sumo 1 fila por
 * (tipo, categoría), `id` = categoría. "Plan de estudios" (V515, solo
 * PEI/PEC) admite VARIAS filas activas a la vez -- ahí `id` es el
 * `archivoId` (como texto), porque puede haber más de una.
 *
 * Sembrado con "Plan de estudios" (PEI) ya con un archivo cargado, para
 * ver el avance parcial desde el arranque sin subir nada primero. PMI
 * arranca sin nada (todas sus categorías, la única, PENDIENTE).
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
  ...documentCategoriesForType("PEI")
    .filter((categoria) => categoria !== "PLAN_ESTUDIOS")
    .map(
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
  ...documentCategoriesForType("PMI").map(
    (categoria): DocumentCategory => ({
      id: categoria,
      type: "PMI",
      typeName: "Plan de Mejoramiento Institucional (PMI)",
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
 * "Completa" = al menos 1 archivo por cada categoría OBLIGATORIA (V521:
 * "Plan escolar de gestión del riesgo" quedó opcional, no cuenta acá),
 * contando por CATEGORÍA (no por fila -- "Plan de estudios" con 3
 * archivos sigue contando 1, no 3).
 */
function recalcDocumentProgress(type: DocumentType): void {
  const requeridas = requiredDocumentCategoriesForType(type)
  const rows = documentCategoriesDb.filter(
    (c) => c.type === type && requeridas.includes(c.categoria),
  )
  const completadas = new Set(rows.filter((c) => c.fileName !== null).map((c) => c.categoria))
  const document = documentsDb.find((d) => d.type === type)
  if (!document || document.status === "NO_APLICA") return
  document.completedCategories = completadas.size
  document.totalCategories = requeridas.length
  document.status = completadas.size === requeridas.length ? "COMPLETO" : "PENDIENTE"
}
recalcDocumentProgress("PEI")
recalcDocumentProgress("PMI")

export function findDocumentByType(type: DocumentType): Document | undefined {
  return documentsDb.find((document) => document.type === type)
}

/**
 * Todas las filas de un tipo. "Plan de estudios" (solo PEI/PEC) sin
 * ningún archivo activo agrega una fila PENDIENTE placeholder (mismo
 * criterio que el backend real, V515) para que la categoría siga
 * apareciendo en la pantalla aunque todavía no tenga nada cargado. PMI/PFI
 * no tienen "Plan de estudios" -- no aplica el placeholder.
 */
export function listDocumentCategories(type: DocumentType): DocumentCategory[] {
  // Mismo orden que el backend real (V588): documento principal primero.
  const orden = documentCategoriesForType(type)
  const rows = documentCategoriesDb
    .filter((c) => c.type === type)
    .sort((a, b) => orden.indexOf(a.categoria) - orden.indexOf(b.categoria))
  if (type !== "PEI" && type !== "PEC") return rows

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
 * Archivos subidos (paso 1 del guardado "todo o nada", V555.5) que todavía
 * no cuelgan de ningún anexo. Igual que `pigse.tarchivo` en el backend real:
 * existen, pero el documento no cambia hasta el paso 2.
 */
const stagedFiles = new Map<number, { fileName: string; sizeBytes: number }>()

export function stageDocumentFile(params: { fileName: string; sizeBytes: number }): {
  archivoId: number
  fileName: string
  sizeBytes: number
} {
  const archivoId = nextArchivoId()
  stagedFiles.set(archivoId, params)
  return { archivoId, ...params }
}

/** Anexos obligatorios sin ningún archivo vigente (mismo criterio que `fn_documento_validar_completo`). */
function missingRequiredCategories(
  type: DocumentType,
  rows: DocumentCategory[],
): DocumentCategoryCode[] {
  return requiredDocumentCategoriesForType(type).filter(
    (categoria) =>
      !rows.some((c) => c.type === type && c.categoria === categoria && c.archivoId != null),
  )
}

/**
 * Paso 2 (`fn_documento_guardar_lote`): aplica bajas y anexos sobre una COPIA
 * y solo la confirma si el documento queda completo — "todo o nada", igual que
 * la transacción del backend real.
 */
export function saveDocumentAnnexesBatch(params: {
  type: DocumentType
  anexos: { categoria: string; archivoId: number }[]
  quitar: number[]
}): { rows: DocumentCategory[] } | { error: string; status: number } {
  const { type } = params
  if (params.anexos.length === 0 && params.quitar.length === 0) {
    return { error: "No hay cambios para guardar.", status: 400 }
  }

  const draft = documentCategoriesDb.map((c) => ({ ...c }))
  const uploadedAt = new Date().toISOString()
  const typeName = DOCUMENT_TYPES.find((t) => t.id === type)?.name ?? type

  for (const archivoId of params.quitar) {
    const index = draft.findIndex((c) => c.type === type && c.archivoId === archivoId)
    if (index < 0) {
      return { error: `El archivo ${archivoId} no es un anexo vigente de ${type}.`, status: 404 }
    }
    if (draft[index].categoria === "PLAN_ESTUDIOS") {
      draft.splice(index, 1)
    } else {
      draft[index] = {
        ...draft[index],
        status: "PENDIENTE",
        fileName: null,
        uploadedAt: null,
        sizeBytes: null,
        archivoId: null,
        downloadUrl: null,
      }
    }
  }

  for (const anexo of params.anexos) {
    const categoria = anexo.categoria as DocumentCategoryCode
    if (!documentCategoriesForType(type).includes(categoria)) {
      return { error: `${type} no admite la categoría ${anexo.categoria}.`, status: 400 }
    }
    const staged = stagedFiles.get(anexo.archivoId)
    if (!staged) {
      return {
        error: `El archivo ${anexo.archivoId} no existe o ya está asociado a un documento.`,
        status: 404,
      }
    }
    const row: DocumentCategory = {
      id: categoria === "PLAN_ESTUDIOS" ? String(anexo.archivoId) : categoria,
      type,
      typeName,
      categoria,
      categoriaName: documentCategoryDisplayName(categoria),
      status: "COMPLETO",
      fileName: staged.fileName,
      uploadedAt,
      sizeBytes: staged.sizeBytes,
      archivoId: anexo.archivoId,
      downloadUrl: `/api/files/download/${anexo.archivoId}`,
    }
    const index =
      categoria === "PLAN_ESTUDIOS"
        ? -1
        : draft.findIndex((c) => c.type === type && c.categoria === categoria)
    if (index >= 0) draft[index] = row
    else draft.push(row)
  }

  const missing = missingRequiredCategories(type, draft)
  if (missing.length > 0) {
    const names = missing.map((c) => documentCategoryDisplayName(c)).join(", ")
    return {
      error: `Faltan ${missing.length} anexo(s) obligatorio(s) de ${type}: ${names}.`,
      status: 409,
    }
  }

  for (const anexo of params.anexos) stagedFiles.delete(anexo.archivoId)
  documentCategoriesDb.splice(0, documentCategoriesDb.length, ...draft)
  recalcDocumentProgress(type)
  return { rows: listDocumentCategories(type) }
}
