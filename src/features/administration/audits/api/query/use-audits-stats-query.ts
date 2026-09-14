import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import { toBind } from "@/features/administration/audits/api/real-mapping"
import type { AuditsStats, AuditsStatsRequest } from "@/features/administration/audits/api/types/audit"

async function fetchAuditsStats(body: AuditsStatsRequest): Promise<AuditsStats> {
  const path = apiPath("/audits/stats", "/audits/stats", AUDIT_API_PREFIX)

  if (env.ENABLE_API_MOCKING) {
    return api.query(path, body)
  }

  // V384: BODY.IDS (family_id separados por coma) tiene prioridad sobre los
  // filtros en el backend -- acá basta con mandar ambos, nunca hace falta
  // elegir cuál mandar. `status` es un solo valor en el catálogo, igual que
  // en /audits/query: con varios seleccionados se manda vacío (sin filtro).
  const statuses = body.filters?.status
  const response = await api.query<RowsEnvelope<AuditsStats>>(path, {
    ids: (body.ids ?? []).join(","),
    filters: {
      author: toBind(body.filters?.author),
      status: statuses?.length === 1 ? statuses[0] : "",
      startedFrom: toBind(body.filters?.startedFrom),
      startedTo: toBind(body.filters?.startedTo),
    },
  })
  const row = unwrapRows(response)[0]
  return {
    sessionsToday: Number(row?.sessionsToday ?? 0),
    activeSessions: Number(row?.activeSessions ?? 0),
    operationsToday: Number(row?.operationsToday ?? 0),
  }
}

export function useAuditsStatsQuery(params: AuditsStatsRequest) {
  return useQuery({
    queryKey: ["audits", "stats", params],
    queryFn: () => fetchAuditsStats(params),
    placeholderData: (previous) => previous,
    // Mismo criterio que useAuditsQuery (la lista que acompañan estas
    // tarjetas): sin esto, el staleTime global de 60s (queryConfig) deja
    // las tarjetas mostrando números de hasta un minuto atrás al volver a
    // entrar a la pantalla, mientras la lista de abajo (que sí revalida)
    // ya muestra datos nuevos -- exactamente el desfase reportado en vivo.
    staleTime: 0,
  })
}
