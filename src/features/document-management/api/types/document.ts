/**
 * Tipos de documento institucional que un establecimiento educativo puede
 * cargar en el módulo de Gestión documental.
 *
 * Catálogo cerrado (PEI, PEC, PMI, PFI); si el día de mañana se agrega un
 * nuevo tipo, se agrega acá y se siembra en `mocks/db/documents.ts`. El
 * discriminador (`id` de tipo) es lo que viaja en la URL/ruta — no un id
 * autonumérico de base — porque hay a lo sumo una versión vigente por
 * tipo.
 *
 * PMI/PFI (V521) son el mismo par excluyente que PEI/PEC, solo que para
 * el plan de mejoramiento/fortalecimiento en vez del proyecto educativo:
 * PMI aplica a establecimientos regulares (`etnias = 'N'`), PFI a
 * etnoeducativos (`etnias = 'S'`). El que no aplica no llega a ESTA
 * lista — el backend ya la filtra (`fn_documentos_listar`), no hace
 * falta un estado "no aplica" para el tipo que falta.
 */
export type DocumentType = "PEI" | "PEC" | "PMI" | "PFI"

/**
 * Estado de entrega de un documento para un establecimiento.
 *
 * Los tres los devuelve `academico_test.fn_pigse_documentos_listar`:
 *
 * ```sql
 * CASE
 *     WHEN tipos.tipo = 'PEI' AND te.etnias = 'S' THEN 'NO_APLICA'
 *     WHEN tipos.tipo = 'PEC' AND te.etnias = 'N' THEN 'NO_APLICA'
 *     WHEN d.fk_tarchivo IS NOT NULL              THEN 'COMPLETO'
 *     ELSE                                             'PENDIENTE'
 * END
 * ```
 *
 * `NO_APLICA` sale de la MODALIDAD del EE y es excluyente entre PEI/PEC
 * (proyecto educativo) y entre PMI/PFI (plan de mejoramiento/
 * fortalecimiento): un establecimiento etnoeducativo (`etnias = 'S'`)
 * entrega PEC + PFI, uno regular (`etnias = 'N'`) entrega PEI + PMI.
 *
 * V521: el tipo que no aplica ya NO llega como fila con este estado — el
 * backend lo excluye directo de `fn_documentos_listar`/`_todos`. Sigue
 * existiendo acá porque `fn_documento_categorias_listar` SÍ puede devolver
 * una categoría puntual en `NO_APLICA` (si alguien entra a la URL de un
 * tipo que no le corresponde).
 *
 * No es lo mismo que `PENDIENTE`: pendiente es "falta que lo suban",
 * no-aplica es "este EE no tiene que entregarlo". Por eso no ofrece acción
 * de carga ni cuenta para el porcentaje de avance.
 */
export type DocumentStatus = "COMPLETO" | "PENDIENTE" | "NO_APLICA"

/**
 * Fila principal de la tabla de "Detalle documentos". Es plana (no
 * anidada) porque el listado siempre expone estos mismos campos.
 */
export interface Document {
  /** Mismo valor que `type`: el discriminador sirve de PK natural. */
  id: DocumentType
  type: DocumentType
  typeName: string
  status: DocumentStatus
  /** `null` cuando el estado es PENDIENTE. */
  fileName: string | null
  /** ISO 8601; `null` cuando no hay versión vigente. */
  uploadedAt: string | null
  /** Peso en bytes; `null` cuando no hay archivo. */
  sizeBytes: number | null
  /**
   * `pk_tarchivo` del archivo vigente. `null` si PENDIENTE o NO_APLICA.
   *
   * Es la clave de TODOS los endpoints del file-service
   * (`/files/download/{id}`, `/files/view-token/{id}`, `/files/view/{id}`):
   * sin él no hay forma de pedir el binario.
   */
  archivoId: number | null
  /**
   * Ruta ya armada por el backend: `/api/files/download/{archivoId}`.
   *
   * Viene ABSOLUTA desde la raíz, no relativa al `baseURL` del cliente — por
   * eso se pide con una instancia de axios sin `baseURL` (ver `downloadArchivo`
   * en `lib/files.ts`), o quedaría `/api/api/files/...`.
   *
   * NO sirve como `href` de un `<a>`: el endpoint exige `Authorization:
   * Bearer` y un enlace plano no manda cabeceras. Hay que hacer fetch y
   * guardar el blob.
   */
  downloadUrl: string | null
  /**
   * Nombre del establecimiento dueño del documento.
   *
   * OPCIONAL porque hoy el backend todavía no lo manda:
   * `fn_pigse_documentos_listar` ya resuelve el EE del token con
   * `fn_pigse_mi_establecimiento(:CONTEXT.EMAIL)` para filtrar las filas,
   * pero no devuelve su nombre. Y ningún otro endpoint de PIGSE sirve:
   * `/establecimientos` lista TODOS sin marcar cuál es el mío, y
   * `/cumplimiento/listar` está vedado para el Rector por RBAC.
   *
   * Mientras no llegue, la pantalla omite el nombre en vez de inventarlo.
   */
  establishmentName?: string | null
  /**
   * V521: los 4 tipos (antes solo PEI/PEC) cuelgan de anexos por categoría,
   * nunca de un archivo propio — en PEI/PEC `fileName`/`archivoId`/
   * `downloadUrl` de esta fila quedan `null`; en PMI/PFI traen el archivo
   * del plan (lo usa el tablero de monitoreo). El detalle vive en cada anexo
   * (`DocumentCategory`, ver `fn_documento_categorias_listar`). `status`
   * sigue siendo la fuente de verdad de "completo": COMPLETO exige
   * `completedCategories === totalCategories` (ya lo calcula el backend,
   * el front no lo reinventa). PEI/PEC: 4 de sus 5 categorías cuentan acá
   * ("Plan escolar de gestión del riesgo" es opcional, ver
   * `DOCUMENT_CATEGORIES_BY_TYPE`); PMI/PFI: el plan y su autoevaluación.
   */
  completedCategories?: number | null
  totalCategories?: number | null
}

/** Las 5 categorías fijas de un PEI/PEC (V512). Catálogo cerrado en código
 *  (no en uno de BD): pedido explícito, "fijo son esas 5". Si el día de
 *  mañana se agrega una, se agrega acá y en el `CHECK` del backend
 *  (`fn_documento_guardar`/`fn_documento_eliminar`). */
const PEI_PEC_CATEGORIES = [
  "PLAN_ESTUDIOS",
  "SIEE",
  "MANUAL_CONVIVENCIA",
  "PROYECTOS_TRANSVERSALES",
  "PLAN_GESTION_RIESGO",
] as const

/** PMI/PFI (V521): el plan propiamente dicho y su anexo obligatorio de
 *  autoevaluación. Antes había un solo hueco (la autoevaluación) y las
 *  escuelas subían ahí el plan; V554 reetiquetó esas cargas como plan. */
const PMI_CATEGORIES = ["PLAN_MEJORAMIENTO", "AUTOEVALUACION_INSTITUCIONAL"] as const
const PFI_CATEGORIES = ["PLAN_FORTALECIMIENTO", "AUTOEVALUACION_INSTITUCIONAL"] as const

export const DOCUMENT_CATEGORIES = [
  ...PEI_PEC_CATEGORIES,
  "PLAN_MEJORAMIENTO",
  "PLAN_FORTALECIMIENTO",
  "AUTOEVALUACION_INSTITUCIONAL",
] as const
export type DocumentCategoryCode = (typeof DOCUMENT_CATEGORIES)[number]

/** Qué categorías le corresponden a cada tipo — PEI/PEC comparten las 5 de
 *  siempre, PMI/PFI tienen su plan + "Autoevaluación institucional". */
export function documentCategoriesForType(type: DocumentType): readonly DocumentCategoryCode[] {
  if (type === "PMI") return PMI_CATEGORIES
  if (type === "PFI") return PFI_CATEGORIES
  return PEI_PEC_CATEGORIES
}

/**
 * Categorías que SÍ hacen falta para que el documento quede COMPLETO
 * (V521): de las 5 de PEI/PEC, "Plan escolar de gestión del riesgo" quedó
 * opcional — se puede cargar igual, solo que no bloquea el estado del
 * documento padre. PMI/PFI: su única categoría siempre es obligatoria.
 */
export function requiredDocumentCategoriesForType(type: DocumentType): readonly DocumentCategoryCode[] {
  return documentCategoriesForType(type).filter((categoria) => categoria !== "PLAN_GESTION_RIESGO")
}

export function documentCategoryDisplayName(categoria: DocumentCategoryCode): string {
  switch (categoria) {
    case "PLAN_ESTUDIOS":
      return "Plan de estudios"
    case "SIEE":
      return "Sistema Institucional de Evaluación (SIEE)"
    case "MANUAL_CONVIVENCIA":
      return "Manual de convivencia"
    case "PROYECTOS_TRANSVERSALES":
      return "Proyectos pedagógicos transversales"
    case "PLAN_GESTION_RIESGO":
      // "(opcional)" igual que el nombre que ya manda el backend real
      // (V521) — se repite acá para que el mock (sin backend real detrás)
      // muestre lo mismo.
      return "Plan escolar de gestión del riesgo (opcional)"
    case "PLAN_MEJORAMIENTO":
      return "Plan de Mejoramiento Institucional"
    case "PLAN_FORTALECIMIENTO":
      return "Plan de Fortalecimiento Institucional"
    case "AUTOEVALUACION_INSTITUCIONAL":
      return "Autoevaluación institucional (anexo)"
  }
}

/**
 * Fila de la tabla de anexos de un PEI/PEC puntual
 * (`fn_documento_categorias_listar`, `GET /documentos/:TIPO/categorias`).
 * Mismo campo `type` (PEI o PEC, el padre) + `typeName`, más `categoria`/
 * `categoriaName` — el resto (status/fileName/uploadedAt/sizeBytes/
 * archivoId/downloadUrl) es exactamente lo que ya tenía `Document` para un
 * documento de un solo archivo.
 *
 * `id` NO es siempre `categoria` (V515): "Plan de estudios" admite varios
 * archivos a la vez, así que ahí `id` es el `archivoId` de esa fila puntual
 * (como texto) — sigue siendo `categoria` para las otras 4 categorías (un
 * solo archivo cada una, igual que en V512) y para la fila PENDIENTE
 * placeholder de "Plan de estudios" cuando todavía no tiene ningún archivo.
 */
export interface DocumentCategory {
  id: string
  type: DocumentType
  typeName: string
  categoria: DocumentCategoryCode
  categoriaName: string
  status: DocumentStatus
  fileName: string | null
  uploadedAt: string | null
  sizeBytes: number | null
  archivoId: number | null
  downloadUrl: string | null
}

/** Forma común de respuesta para las mutaciones de un anexo (upload/delete). */
export interface DocumentCategoryMutationResult {
  status: "ok" | "error"
  message: string
  document: DocumentCategory
}

/**
 * Etiqueta legible del tipo de documento para usar en headers y
 * breadcrumbs. Es la misma que arma el backend (`fn_documento_nombre`)
 * pero la centralizamos acá porque la usan tanto la página
 * institucional como el visor de PDF y el tablero de monitoreo.
 */
export function documentTypeDisplayName(type: DocumentType): string {
  switch (type) {
    case "PEI":
      return "Proyecto Educativo Institucional (PEI)"
    case "PEC":
      return "Proyecto Educativo Comunitario (PEC)"
    case "PMI":
      return "Plan de Mejoramiento Institucional (PMI)"
    case "PFI":
      return "Plan de Fortalecimiento Institucional (PFI)"
  }
}
