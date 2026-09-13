import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { SessionStatusOption } from "@/features/administration/audits/api/types/audit"

/**
 * Igual que los tipos de operación: no hay catálogo en el backend. El estado
 * no se persiste siquiera — V90 lo COMPUTA en lectura (`active` mientras no
 * haya `close_reason` ni más de 30 min sin `last_seen_at`), así que el
 * vocabulario es fijo y vive acá.
 */
const SESSION_STATUS_OPTIONS: SessionStatusOption[] = [
  { key: "active", label: "Activo" },
  { key: "closed", label: "Cerrada" },
]

function fetchAuditSessionStatuses(): Promise<SessionStatusOption[]> {
  if (!env.ENABLE_API_MOCKING) return Promise.resolve(SESSION_STATUS_OPTIONS)
  return api.get("/audit-session-statuses")
}

export const auditSessionStatusesQueryKey = () => ["audit-session-statuses"]

export function useAuditSessionStatusesQuery() {
  return useQuery({
    queryKey: auditSessionStatusesQueryKey(),
    queryFn: fetchAuditSessionStatuses,
    staleTime: Infinity,
  })
}
