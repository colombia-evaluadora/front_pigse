/**
 * Estado de cumplimiento POR documento de un establecimiento, tal como lo
 * arma `pigse.fn_cumplimiento_listar` (V523) en el jsonb de cada tipo.
 *
 * `status` es el de siempre (lo produce `fn_documentos_listar`):
 * - `COMPLETO`  → todos los anexos obligatorios cargados.
 * - `PENDIENTE` → falta al menos uno (puede tener otros cargados).
 * - `NO_APLICA` → el tipo no corresponde por `ETNIAS` (PEI/PMI en
 *   etnoeducativos, PEC/PFI en el resto).
 *
 * `estado` (V523) separa el PENDIENTE en lo que el monitor necesita ver:
 * `PARCIAL` (ya cargó algún anexo) vs `SIN_CARGAR` (no cargó nada). Es
 * opcional en el tipo porque un backend sin V523 no lo manda: el front lo
 * deriva con `resolveEstado` (ver `ui-mappings.ts`).
 */
export type ComplianceStatus = "COMPLETO" | "PENDIENTE" | "NO_APLICA"
export type ComplianceEstado = "COMPLETO" | "PARCIAL" | "SIN_CARGAR" | "NO_APLICA"

export interface ComplianceDocumentState {
  status: ComplianceStatus
  estado?: ComplianceEstado
  /**
   * Archivo "principal" del tipo: solo PMI/PFI lo traen (el plan). PEI/PEC
   * van siempre por anexos y aquí llega `null` -- por eso el tablero ya no
   * abre el visor desde la celda, sino el detalle documental del EE.
   */
  fileName?: string | null
  archivoId?: number | null
  downloadUrl?: string | null
  /** Anexos obligatorios cargados / total obligatorio (V521). */
  completedCategories?: number | null
  totalCategories?: number | null
  /** Última carga de cualquier anexo del tipo (ISO). */
  lastUploadedAt?: string | null
}

/** Tipos de documento que se relevan en el tablero. */
export type DocumentType = "PEI" | "PEC" | "PMI" | "PFI"

/**
 * Plazo efectivo del EE (V522): la excepción propia si la tiene, si no la
 * fecha global. `VENCIDO` solo dice que la fecha pasó; si además el EE no
 * completó, la UI lo marca como incumplido.
 */
export type CompliancePlazo = "SIN_FECHA" | "VIGENTE" | "VENCIDO"

/** Una fila de "Detalle por establecimiento". */
export interface ComplianceRow {
  /** PK del establecimiento. */
  id: number
  establishmentName: string
  /** Código DANE. */
  establishmentCode?: string | null
  municipioId?: number | null
  municipio?: string | null
  etnoeducativo?: boolean | null
  pei: ComplianceDocumentState
  pec: ComplianceDocumentState
  pmi: ComplianceDocumentState
  pfi: ComplianceDocumentState
  /**
   * 0..100 — porcentaje de documentos COMPLETOS sobre los que aplican (los
   * `NO_APLICA` quedan fuera del denominador).
   */
  globalProgress: number
  lastUploadedAt?: string | null
  /** `yyyy-MM-dd`. `null` = sin fecha límite configurada. */
  fechaLimite?: string | null
  tieneExcepcion?: boolean | null
  plazo?: CompliancePlazo | null
}

/** Bloque por documento dentro de las métricas globales. */
export interface ComplianceMetricBlock {
  completed: number
  total: number
  percent: number
}

/** KPIs del tablero. */
export interface ComplianceMetrics {
  totalEstablishments: number
  pei: ComplianceMetricBlock
  pec: ComplianceMetricBlock
  pmi: ComplianceMetricBlock
  pfi: ComplianceMetricBlock
}

/** Valores del filtro de plazo (`BODY.FILTERS.PLAZO`, V524). */
export type CompliancePlazoFilter = "VENCIDO" | "PRORROGA" | "VIGENTE" | "SIN_FECHA"

/**
 * Filtros del tablero. Los estados por tipo van como ARRAY (lo espera
 * `optionsTerm` y el backend). Aceptan tanto el `status` clásico
 * (COMPLETO/PENDIENTE/NO_APLICA) como el `estado` derivado (PARCIAL/
 * SIN_CARGAR): `fn_cumplimiento_listar_paginado` compara contra ambos.
 */
export interface ComplianceFilters {
  /** Texto libre: nombre, código DANE o municipio. */
  search: string
  pei: string[]
  pec: string[]
  pmi: string[]
  pfi: string[]
  plazo: string[]
  /** `"S"` etnoeducativo, `"N"` regular, `""` todos. */
  etnias: string
}

/** Filtros vacíos: el estado inicial y lo que deja "limpiar todo". */
export const EMPTY_COMPLIANCE_FILTERS: ComplianceFilters = {
  search: "",
  pei: [],
  pec: [],
  pmi: [],
  pfi: [],
  plazo: [],
  etnias: "",
}

/**
 * Archivo de un anexo en el detalle documental
 * (`GET /cumplimiento/establecimientos/:id/documentos/:tipo`, V555.1).
 */
export interface ComplianceFile {
  id: string
  archivoId: number
  fileName: string | null
  uploadedAt: string | null
  sizeBytes: number | null
  downloadUrl: string | null
}

/** Un anexo (categoría) del tipo, con sus archivos. */
export interface ComplianceCategory {
  categoria: string
  categoriaName: string
  /** `false` solo para "Plan escolar de gestión del riesgo". */
  obligatoria: boolean
  status: ComplianceStatus
  /** "Plan de estudios" admite varios archivos (V515). */
  multiple: boolean
  archivos: ComplianceFile[]
}

/** Detalle documental de UN establecimiento para UN tipo. */
export interface ComplianceDocumentDetail {
  establishmentId: number
  establishmentName: string
  establishmentCode: string | null
  municipio: string | null
  etnoeducativo: boolean | null
  type: DocumentType
  typeName: string
  status: ComplianceStatus
  estado: ComplianceEstado | null
  completedCategories: number | null
  totalCategories: number | null
  lastUploadedAt: string | null
  fechaLimite: string | null
  tieneExcepcion: boolean | null
  plazo: CompliancePlazo | null
  categorias: ComplianceCategory[]
}
