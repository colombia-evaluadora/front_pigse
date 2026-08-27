/**
 * Estado de cumplimiento documental POR documento de un establecimiento.
 * Es lo que pinta la celda en la tabla "Detalle por establecimiento":
 * el dot verde/rojo + el nombre del archivo en el popover.
 *
 * Los tres estados se traducen a tres visualizaciones distintas en la UI:
 * - `COMPLETO`  → dot verde + nombre del archivo en hover.
 * - `PENDIENTE` → dot rojo solo (el EE puede/debe cargarlo).
 * - `NO_APLICA` → texto "N/A" sin dot (el EE no aplica para este documento).
 *
 * La exclusividad mutua PEI/PEC sale de la modalidad del EE (ver
 * `pickDocumentState` en `mocks/db/compliance.ts`): un EE de tipo
 * "Institución Educativa" tiene PEI como documento aplicable y PEC como
 * `NO_APLICA`; un EE etnoeducativo, al revés. PMI siempre aplica.
 */
export interface ComplianceDocumentState {
  status: "COMPLETO" | "PENDIENTE" | "NO_APLICA"
  /** Nombre del archivo vigente. `null` cuando NO aplica o está pendiente. */
  fileName: string | null
  /**
   * `pk_tarchivo` del archivo vigente. `null` si no hay.
   *
   * Viaja acá —y no se resuelve después— porque desde el tablero NO se puede
   * consultar `/documentos`: ese endpoint devuelve el EE del token y los roles
   * territoriales ni siquiera lo tienen asociado. La referencia al binario
   * tiene que venir con la fila.
   */
  archivoId: number | null
  /** Ruta de descarga armada por el backend (`/api/files/download/{id}`). */
  downloadUrl: string | null
}

/** Tipos de documento que se relevan en el tablero. */
export type DocumentType = "PEI" | "PEC" | "PMI"

/** Una fila de "Detalle por establecimiento". */
export interface ComplianceRow {
  /** PK del establecimiento — es opaco para la pantalla, no se muestra. */
  id: number
  establishmentName: string
  pei: ComplianceDocumentState
  pec: ComplianceDocumentState
  pmi: ComplianceDocumentState
  /**
   * 0..100 — porcentaje global del EE. Solo cuentan los documentos
   * `COMPLETO`/`PENDIENTE`; los `NO_APLICA` quedan fuera del denominador
   * para no castigar al EE con un 0% por no aplicar.
   */
  globalProgress: number
}

/** Bloque por documento dentro de las métricas globales. */
export interface ComplianceMetricBlock {
  completed: number
  total: number
  percent: number
}

/** KPIs del tablero (la fila de tarjetas del Figma). */
export interface ComplianceMetrics {
  totalEstablishments: number
  pei: ComplianceMetricBlock
  pec: ComplianceMetricBlock
  pmi: ComplianceMetricBlock
}

/**
 * Filtros del tablero. Mismo contrato que el resto de los listados: el texto
 * libre y los avanzados viajan juntos y se serializan al input del buscador
 * (ver `components/search/query-syntax.ts`).
 *
 * Los estados van como ARRAY aunque el selector deje elegir uno solo: es lo
 * que espera `optionsTerm`, y deja la puerta abierta a multi-selección sin
 * cambiar el tipo ni el parseo de la consulta.
 */
export interface ComplianceFilters {
  /** Texto libre contra el nombre del establecimiento. */
  search: string
  pei: string[]
  pec: string[]
  pmi: string[]
}

/** Filtros vacíos: el estado inicial y lo que deja "limpiar todo". */
export const EMPTY_COMPLIANCE_FILTERS: ComplianceFilters = {
  search: "",
  pei: [],
  pec: [],
  pmi: [],
}
