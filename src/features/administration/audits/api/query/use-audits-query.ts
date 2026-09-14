import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import { sortWindow, toBind, toIsoDateTime } from "@/features/administration/audits/api/real-mapping"
import type {
  AuditSession,
  AuditsQueryRequest,
  AuditsQueryResponse,
  SessionStatus,
} from "@/features/administration/audits/api/types/audit"

interface UseAuditsQueryParams {
  filters: AuditsQueryRequest["filters"]
  sorting: AuditsQueryRequest["sorting"]
  pageIndex: number
  pageSize: number
}

/** Fila cruda de V90 §2.2 — sesiones reales del mirror `tsesion_web`. */
interface RealAuditSessionRow {
  id: string
  authorName: string | null
  authorAvatarUrl: string | null
  authorVerified: boolean | null
  ip: string | null
  startedAt: string
  endedAt: string | null
  status: SessionStatus
  operationsCount: number
  totalCount: number
}

function toAuditSession(row: RealAuditSessionRow): AuditSession {
  return {
    // `family_id` del refresh token (claim `fid`), no un id sintético.
    id: row.id,
    authorName: row.authorName ?? "",
    authorAvatarUrl: row.authorAvatarUrl ?? null,
    authorVerified: row.authorVerified ?? false,
    ip: row.ip ?? "",
    startedAt: toIsoDateTime(row.startedAt) ?? row.startedAt,
    // `endedAt` se COMPUTA en lectura (close_reason conocido, o
    // `last_seen_at` con más de 30 min): una sesión viva no tiene cierre.
    endedAt: toIsoDateTime(row.endedAt),
    status: row.status,
    operationsCount: Number(row.operationsCount ?? 0),
  }
}

async function fetchAudits(params: UseAuditsQueryParams): Promise<AuditsQueryResponse> {
  const path = apiPath("/audits/query", "/audits/query", AUDIT_API_PREFIX)

  if (env.ENABLE_API_MOCKING) {
    return api.query(path, params)
  }

  // `status` es un solo valor en el catálogo (`BODY.FILTERS.STATUS` VARCHAR);
  // con varios seleccionados se trae todo y se recorta acá.
  const statuses = params.filters.status
  const response = await api.query<RowsEnvelope<RealAuditSessionRow>>(path, {
    filters: {
      author: toBind(params.filters.author),
      status: statuses?.length === 1 ? statuses[0] : "",
      startedFrom: toBind(params.filters.startedFrom),
      startedTo: toBind(params.filters.startedTo),
    },
    sorting: "",
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
  })

  const rawRows = unwrapRows(response)
  // V376 (sso): el servidor ya pagina de verdad -- esto es la página real,
  // no una ventana de 100 para recortar acá. `totalCount` (`count() OVER()`)
  // ya es el total global, ajeno al LIMIT/OFFSET de esta página.
  const totalCount = rawRows[0]?.totalCount ?? 0
  const rows = sortWindow(
    rawRows.map(toAuditSession).filter((row) => !statuses?.length || statuses.includes(row.status)),
    params.sorting,
  )

  return {
    rows,
    pageCount: Math.max(1, Math.ceil(totalCount / params.pageSize)),
    totalCount,
  }
}

export const auditsQueryKey = (params: UseAuditsQueryParams) => ["audits", params]

export function useAuditsQuery(params: UseAuditsQueryParams) {
  return useQuery({
    queryKey: auditsQueryKey(params),
    queryFn: () => fetchAudits(params),
    placeholderData: (previous) => previous,
    // Cada entrada a "Registro de actividad" revalida contra el backend en
    // vez de confiar en el cache (60s por default) — el `placeholderData`
    // de arriba evita el flash vacío mientras se revalida.
    staleTime: 0,
  })
}
