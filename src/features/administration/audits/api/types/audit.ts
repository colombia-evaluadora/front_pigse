export type SessionStatus = "active" | "closed"

// Opción de estado de sesión tal como la entrega el backend: `key` es el
// valor que se guarda/manda, `label` el texto visible en el select / badge.
export interface SessionStatusOption {
  key: SessionStatus
  label: string
}

export interface AuditSession {
  id: string
  authorName: string
  authorAvatarUrl: string | null
  authorVerified: boolean
  ip: string
  startedAt: string
  endedAt: string | null
  status: SessionStatus
  operationsCount: number
}

export interface AuditsQueryFilters {
  author?: string
  status?: SessionStatus[]
  startedFrom?: string
  startedTo?: string
}

export interface AuditsQueryRequest {
  filters: AuditsQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface AuditsQueryResponse {
  rows: AuditSession[]
  pageCount: number
  totalCount: number
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}

// Igual que exportar: se calcula sobre lo seleccionado (`ids`) o, si no hay
// selección, sobre lo que coincide con los filtros activos (`filters`).
export interface AuditsStatsRequest {
  ids?: string[]
  filters?: AuditsQueryFilters
}

export interface AuditsStats {
  sessionsToday: number
  activeSessions: number
  operationsToday: number
}

// Una operación dentro de una sesión de auditoría. Es la misma `TableOperation`
// pero se le agrega `tableSlug` para poder agrupar/rutear al dialog de
// cambios correspondiente (`ViewOperationChangesDialog` lo necesita para
// fetchear el detalle).
export interface SessionOperation {
  id: string
  tableSlug: string
  operation: import("./audit-table").OperationType
  entityName: string
  entityId: string
  occurredAt: string
}

export interface SessionOperationsFilters {
  operations?: import("./audit-table").OperationType[]
  tableSlug?: string
  occurredFrom?: string
  occurredTo?: string
}

export interface SessionOperationsQueryRequest {
  sessionId: string
  filters: SessionOperationsFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface SessionOperationsResponse {
  rows: SessionOperation[]
  pageCount: number
  totalCount: number
}

export interface SessionOperationsExportRequest {
  ids?: string[]
}
