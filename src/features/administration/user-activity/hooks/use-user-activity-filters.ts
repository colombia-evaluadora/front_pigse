import { useCallback, useMemo } from "react"

import { actividadUsuariosRoute } from "@/router"

import type {
  UserActivityFiltersFormInput,
  UserActivityFiltersFormValues,
  UserActivitySearch,
} from "@/features/administration/user-activity/api/schema"
import type { UserActivityQueryFilters } from "@/features/administration/user-activity/api/query/use-user-activity-query"

export interface UserActivityFilters {
  filters: UserActivityFiltersFormInput
  queryFilters: UserActivityQueryFilters
  applyFilters: (values: UserActivityFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useUserActivityFilters(): UserActivityFilters {
  const search = actividadUsuariosRoute.useSearch()
  const navigate = actividadUsuariosRoute.useNavigate()

  const applyFilters = useCallback(
    (values: UserActivityFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: values.search || undefined,
          establecimientoId: values.establecimientoId ? Number(values.establecimientoId) : undefined,
          estado: (values.estado || undefined) as UserActivitySearch["estado"],
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  const clearAllFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        establecimientoId: undefined,
        estado: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: UserActivityQueryFilters = useMemo(
    () => ({
      search: search.search ?? "",
      establecimientoId: search.establecimientoId,
      estado: search.estado ?? "",
    }),
    [search.search, search.establecimientoId, search.estado],
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.search) n += 1
    if (search.establecimientoId != null) n += 1
    if (search.estado) n += 1
    return n
  }, [search.search, search.establecimientoId, search.estado])

  return {
    filters: {
      search: search.search ?? "",
      establecimientoId: search.establecimientoId != null ? String(search.establecimientoId) : "",
      estado: search.estado ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
