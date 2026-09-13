import type { SessionStatus } from "@/features/administration/audits/api/types/audit"
import type { OperationType } from "@/features/administration/audits/api/types/audit-table"

type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"
interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

// Las etiquetas de estado y tipo de operación ahora las entrega el backend
// (`{ key, label }`, vía `useAuditSessionStatusesQuery` y
// `useAuditOperationTypesQuery`). Acá solo queda el color del badge, que
// el back no envía.
export const SESSION_STATUS_BADGE: Record<SessionStatus, BadgeProps> = {
  active: { variant: "soft", color: "success" },
  closed: { variant: "soft", color: "secondary" },
}

export const OPERATION_TYPE_BADGE: Record<OperationType, BadgeProps> = {
  INSERT: { variant: "soft", color: "info" },
  UPDATE: { variant: "soft", color: "warning" },
  DELETE: { variant: "soft", color: "destructive" },
}