import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { toSingleSort } from "@/lib/query-request-mapping"
import { unwrapPaginated } from "@/lib/response-envelope"

import type { UserActivityRow } from "@/features/administration/user-activity/api/types/user-activity"

export interface UserActivityQueryFilters {
  search: string
  establecimientoId: number | undefined
  estado: string
}

export interface UserActivityQueryRequest {
  filters: UserActivityQueryFilters
  sorting: { id: string; desc: boolean }[]
  pageIndex: number
  pageSize: number
}

export interface UserActivityQueryResponse {
  rows: UserActivityRow[]
  pageCount: number
  totalCount: number
}

/**
 * `POST /pigse/usuarios/actividad/query` (V495): una fila por
 * (establecimiento, usuario PIGSE activo) con su último ingreso/actividad.
 * Solo lectura — sin mutaciones ni gestión de sesiones, no hay para qué
 * invalidar nada.
 *
 * `establecimientoId: ""` responde 400 en el backend real (`filters.
 * establecimientoId` vacío no es un `null` válido) — por eso se omite el
 * campo en vez de mandar una cadena vacía, ver `fetchUserActivity`.
 */
async function fetchUserActivity(params: UserActivityQueryRequest): Promise<UserActivityQueryResponse> {
  const path = apiPath("/user-activity/query", "/usuarios/actividad/query")

  const body = {
    pageIndex: params.pageIndex,
    pageSize: params.pageSize,
    sorting: toSingleSort(params.sorting),
    filters: {
      search: params.filters.search,
      establecimientoId: params.filters.establecimientoId ?? null,
      estado: params.filters.estado || null,
    },
  }

  const response = await api.query(path, body)
  return unwrapPaginated<UserActivityRow>(response)
}

export const userActivityQueryKey = (params: UserActivityQueryRequest) =>
  ["user-activity", params] as const

export function useUserActivityQuery(params: UserActivityQueryRequest) {
  return useQuery({
    queryKey: userActivityQueryKey(params),
    queryFn: () => fetchUserActivity(params),
    placeholderData: (previous) => previous,
    // Mismo criterio que `useAuditsQuery`: el estado "en línea" cambia
    // constantemente, no tiene sentido servir cache viejo al reentrar.
    staleTime: 0,
  })
}
