import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRow, type RowsEnvelope } from "@/lib/response-envelope"
import { toIsoDateTime } from "@/features/administration/audits/api/real-mapping"
import type { AuditSession, SessionStatus } from "@/features/administration/audits/api/types/audit"

interface UseAuditSessionQueryParams {
  sessionId: string
  enabled?: boolean
}

/** Fila cruda de V90 §2.3. */
interface RealAuditSessionDetailRow {
  id: string
  authorName: string | null
  authorAvatarUrl: string | null
  authorVerified: boolean | null
  ip: string | null
  startedAt: string
  endedAt: string | null
  status: SessionStatus
  operationsCount: number
}

async function fetchAuditSession(sessionId: string): Promise<AuditSession> {
  const path = apiPath(
    `/audits/sessions/${sessionId}`,
    `/audits/sessions/${sessionId}`,
    AUDIT_API_PREFIX,
  )

  if (env.ENABLE_API_MOCKING) {
    return api.get(path)
  }

  const response = await api.get<RowsEnvelope<RealAuditSessionDetailRow>>(path)
  const row = unwrapRow(response)
  return {
    id: row.id,
    authorName: row.authorName ?? "",
    authorAvatarUrl: row.authorAvatarUrl ?? null,
    authorVerified: row.authorVerified ?? false,
    ip: row.ip ?? "",
    startedAt: toIsoDateTime(row.startedAt) ?? row.startedAt,
    endedAt: toIsoDateTime(row.endedAt),
    status: row.status,
    operationsCount: Number(row.operationsCount ?? 0),
  }
}

export function useAuditSessionQuery({ sessionId, enabled }: UseAuditSessionQueryParams) {
  return useQuery({
    queryKey: ["audits", "sessions", sessionId],
    queryFn: () => fetchAuditSession(sessionId),
    enabled: enabled ?? true,
  })
}
