import type { FieldFilter } from "@/features/administration/audits/api/schema"

export interface AuditTable {
  slug: string
  name: string
  // Nombre de ícono en texto (mismo formato que el menú, ej. "Bank-Icon"),
  // se resuelve a un componente en el cliente — ver getNavIcon.
  icon: string
  operationsToday: number
  // Campos "revisables" de la tabla auditada (ej. tnivel_ensenanza →
  // ["Código", "Nombre", "Descripción"]). El frontend los usa para los
  // filtros por campo del sheet.
  fields: string[]
}

export interface AuditTablesQueryFilters {
  name?: string
}

export interface AuditTablesQueryRequest {
  filters: AuditTablesQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface AuditTablesQueryResponse {
  rows: AuditTable[]
  pageCount: number
  totalCount: number
}

export type OperationType = "INSERT" | "UPDATE" | "DELETE"

// Opción de tipo de operación tal como la entrega el backend: `key` es el
// valor que se guarda/manda, `label` el texto visible en el select / badge.
export interface OperationTypeOption {
  key: OperationType
  label: string
}

export interface TableOperation {
  id: string
  operation: OperationType
  authorName: string
  authorAvatarUrl: string | null
  authorVerified: boolean
  ip: string
  entityName: string
  entityId: string
  occurredAt: string
  // Snapshot de los valores actuales del registro auditado (clave = nombre
  // de campo). Lo usa el backend para resolver los filtros por campo del
  // sheet. `null` significa "el campo no tiene valor" (ej. campo borrado).
  entityFields: Record<string, string | null>
}

export interface TableOperationsQueryFilters {
  author?: string
  operations?: OperationType[]
  occurredFrom?: string
  occurredTo?: string
  // Filtros ad-hoc por campo (entityName, entityId) con condición + valor.
  // Cada uno se aplica como AND sobre las filas.
  fieldFilters?: FieldFilter[]
}

export interface TableOperationsQueryRequest {
  tableSlug: string
  filters: TableOperationsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface TableOperationsQueryResponse {
  rows: TableOperation[]
  pageCount: number
  totalCount: number
}

// Igual que exportar: se calcula sobre lo seleccionado (`ids`) o, si no hay
// selección, sobre lo que coincide con los filtros activos (`filters`).
export interface TableOperationsStatsRequest {
  ids?: string[]
  filters?: TableOperationsQueryFilters
}

export interface TableOperationsStats {
  inserts: number
  updates: number
  deletes: number
}

// Cambio individual asociado a una operación: cada `field` representa
// una columna modificada con su valor anterior, el nuevo (o un único valor
// en INSERT / null en DELETE), y el valor actual del registro (que puede
// diferir de `after` si hubo operaciones posteriores sobre el mismo campo).
// `fieldIndex` permite al cliente devolverlo al backend tal cual al revertir.
export interface OperationChange {
  fieldIndex: number
  field: string
  before: string | null
  after: string | null
  current: string | null
}

export interface OperationChangesResponse {
  operationId: string
  operation: OperationType
  entityName: string
  entityId: string
  totalFields: number
  changedFields: number
  // Se omite del response cuando la operación no tiene cambios que mostrar
  // (ej. INSERT sin valores previos o DELETE donde solo se quitó el registro).
  changes: OperationChange[]
}

// Para revertir: el backend necesita saber qué campo restaurar y con qué
// valor original. `fieldIndex` es el que viajó en el response.
export interface RevertChangeInput {
  fieldIndex: number
}

export interface RevertOperationChangeInput {
  tableSlug: string
  operationId: string
  changes: RevertChangeInput[]
}

export interface RevertOperationChangeResponse {
  status: "ok" | "error"
  message: string
  revertedFields: number
}
