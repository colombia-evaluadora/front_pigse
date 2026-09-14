import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import type { AuditsStats, AuditsStatsRequest } from "@/features/administration/audits/api/types/audit"

async function fetchAuditsStats(body: AuditsStatsRequest): Promise<AuditsStats> {
  const path = apiPath("/audits/stats", "/audits/stats", AUDIT_API_PREFIX)

  if (env.ENABLE_API_MOCKING) {
    return api.query(path, body)
  }

  // V90 §2.5 no declara ningún parámetro: son agregados globales sobre
  // `tsesion_web`, sin filtros ni selección. El body va vacío a propósito —
  // mandar `ids`/`filters` haría que el query-service rechace con 400 por
  // placeholders sin tipo declarado.
  const response = await api.query<RowsEnvelope<AuditsStats>>(path, {})
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
