/**
 * Tipos de documento institucional que un establecimiento educativo puede
 * cargar en el módulo de Gestión documental.
 *
 * Catálogo cerrado por ahora (PEI, PEC, PMI); si el día de mañana se
 * agrega un nuevo tipo, se agrega acá y se siembra en
 * `mocks/db/documents.ts`. El discriminador (`id` de tipo) es lo que
 * viaja en la URL/ruta — no un id autonumérico de base — porque hay a lo
 * sumo una versión vigente por tipo.
 */
export type DocumentType = "PEI" | "PEC" | "PMI"

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
 * `NO_APLICA` sale de la MODALIDAD del EE y es excluyente entre PEI y PEC:
 * un establecimiento etnoeducativo (`etnias = 'S'`) entrega PEC y su PEI no
 * aplica; uno regular (`etnias = 'N'`) al revés. El PMI aplica siempre.
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
   * V512: solo PEI/PEC (`undefined`/`null` en PMI, que no tiene anexos).
   * PEI/PEC ya NO cuelgan de un archivo propio — `fileName`/`archivoId`/
   * `downloadUrl` de esta fila quedan siempre `null` — el archivo real vive
   * en cada uno de sus 5 anexos (`DocumentCategory`, ver
   * `fn_documento_categorias_listar`). `status` sigue siendo la fuente de
   * verdad de "completo": COMPLETO exige `completedCategories ===
   * totalCategories` (ya lo calcula el backend, el front no lo reinventa).
   */
  completedCategories?: number | null
  totalCategories?: number | null
}

/**
 * Anexo dentro de un PEI o PEC (V512): las 5 categorías fijas que exige el
 * negocio, cada una con su propio archivo vigente — mismo modelo de
 * "versión vigente + historial" que antes tenía el documento entero.
 *
 * Catálogo cerrado en código (no en un catálogo de BD): pedido explícito,
 * "fijo son esas 5". Si el día de mañana se agrega una, se agrega acá y en
 * el `CHECK` del backend (`fn_documento_guardar`/`fn_documento_eliminar`).
 */
export const DOCUMENT_CATEGORIES = [
  "PLAN_ESTUDIOS",
  "SIEE",
  "MANUAL_CONVIVENCIA",
  "PROYECTOS_TRANSVERSALES",
  "PLAN_GESTION_RIESGO",
] as const
export type DocumentCategoryCode = (typeof DOCUMENT_CATEGORIES)[number]

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
      return "Plan escolar de gestión del riesgo"
  }
}

/**
 * Fila de la tabla de anexos de un PEI/PEC puntual
 * (`fn_documento_categorias_listar`, `GET /documentos/:TIPO/categorias`).
 * Mismo campo `type` (PEI o PEC, el padre) + `typeName`, más `categoria`/
 * `categoriaName` — el resto (status/fileName/uploadedAt/sizeBytes/
 * archivoId/downloadUrl) es exactamente lo que ya tenía `Document` para un
 * documento de un solo archivo.
 */
export interface DocumentCategory {
  /** Mismo valor que `categoria`: discriminador de fila. */
  id: DocumentCategoryCode
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

/** Forma común de respuesta para las mutaciones (upload/delete). */
export interface DocumentMutationResult {
  status: "ok" | "error"
  message: string
  document: Document
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
  }
}
