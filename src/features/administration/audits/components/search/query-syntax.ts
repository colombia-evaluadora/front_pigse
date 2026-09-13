import {
  optionTerm,
  optionsTerm,
  textTerm,
  type QueryOption,
  type QuerySyntax,
} from "@/components/search/query-syntax"

import {
  FIELD_FILTER_CONDITIONS,
  FIELD_FILTER_CONDITION_LABELS,
  type AuditFiltersFormValues,
  type FieldFilterCondition,
  type SessionOperationsFiltersFormValues,
  type TableOperationsFiltersFormValues,
} from "@/features/administration/audits/api/schema"

/**
 * Las sintaxis de consulta de los buscadores del registro de actividad. La mecánica
 * —serializar/parsear, qué pasa con lo que no se reconoce— vive en
 * `@/components/search/query-syntax`; acá solo se declara qué claves entiende
 * cada listado.
 *
 * Las claves son las mismas que los parámetros de la URL (`?author_ip=…`),
 * para que lo que se escribe en el input y lo que queda en la barra de
 * direcciones se lean igual.
 */

// Dentro de un filtro por campo el valor es `Condición "texto"`.
const FIELD_VALUE_RE = /^(.*?)\s*"(.*)"$/

/** Sesiones de auditoría: la búsqueda libre es el autor o su IP. */
export function auditSessionsSyntax(
  statusOptions: QueryOption[],
): QuerySyntax<AuditFiltersFormValues> {
  return {
    empty: { author: "", status: "", startedFrom: "", startedTo: "" },
    freeText: { key: "author_ip", field: "author" },
    terms: [
      // Selección única: el form lleva un `status`, no `statuses`. La URL sigue
      // exponiendo `statuses` (array) — la conversión se hace en el hook.
      optionTerm("estado", "status", statusOptions),
      textTerm("desde", "startedFrom"),
      textTerm("hasta", "startedTo"),
    ],
  }
}

/**
 * Operaciones de una tabla auditada. Además de los términos fijos admite
 * claves libres —las columnas de esa tabla, que varían por tabla— para los
 * "filtros por campo": `Nombre:(Contiene "abc")`.
 */
export function tableOperationsSyntax(
  operationOptions: QueryOption[],
): QuerySyntax<TableOperationsFiltersFormValues> {
  return {
    empty: {
      author: "",
      operations: [],
      occurredFrom: "",
      occurredTo: "",
      fieldFilters: [],
    },
    // El filtro busca por autor o por IP, y el nombre del parámetro lo dice.
    freeText: { key: "author_ip", field: "author" },
    terms: [
      optionsTerm("operación", "operations", operationOptions),
      textTerm("desde", "occurredFrom"),
      textTerm("hasta", "occurredTo"),
    ],
    wildcard: {
      toTerms: (filters) =>
        filters.fieldFilters.map(
          (filter) =>
            `${filter.field}:(${FIELD_FILTER_CONDITION_LABELS[filter.condition]} "${filter.value}")`,
        ),
      fromTerm: (key, value, draft) => {
        const parts = FIELD_VALUE_RE.exec(value)
        if (!parts) return undefined
        const condition = toCondition(parts[1])
        if (!condition) return undefined
        return {
          fieldFilters: [...draft.fieldFilters, { field: key, condition, value: parts[2] }],
        }
      },
    },
  }
}

/**
 * Operaciones dentro de una sesión. Sin filtros por campo —dependen de la
 * tabla y acá pueden ser N— y la búsqueda libre acota a una tabla.
 */
export function sessionOperationsSyntax(
  operationOptions: QueryOption[],
): QuerySyntax<SessionOperationsFiltersFormValues> {
  return {
    empty: { operations: [], tableSlug: "", occurredFrom: "", occurredTo: "" },
    freeText: { key: "tabla", field: "tableSlug" },
    terms: [
      optionsTerm("operación", "operations", operationOptions),
      textTerm("desde", "occurredFrom"),
      textTerm("hasta", "occurredTo"),
    ],
  }
}

function toCondition(value: string): FieldFilterCondition | undefined {
  const needle = value.trim().toLowerCase()
  return FIELD_FILTER_CONDITIONS.find(
    (condition) =>
      FIELD_FILTER_CONDITION_LABELS[condition].toLowerCase() === needle ||
      condition.toLowerCase() === needle,
  )
}
