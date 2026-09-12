import { useCallback, useMemo } from "react"

import { campusesRoute } from "@/router"

import type { CampusFiltersFormInput } from "@/features/establishment/campuses/api/schema"
import type { CampusesQueryRequest } from "@/features/establishment/campuses/api/types/campus"

export interface CampusesFilters {
  filters: CampusFiltersFormInput
  queryFilters: CampusesQueryRequest["filters"]
  applyFilters: (values: CampusFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useCampusesFilters(): CampusesFilters {
  const search = campusesRoute.useSearch()
  const navigate = campusesRoute.useNavigate()

  const applyFilters = useCallback(
    (values: CampusFiltersFormInput) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: values.search || undefined,
          zones: values.zones.length ? values.zones : undefined,
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate]
  )

  const clearAllFilters = useCallback(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        zones: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters = useMemo(
    () => ({
      search: search.search,
      zones: search.zones,
    }),
    [search.search, search.zones]
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.search) count += 1
    count += search.zones?.length ?? 0
    return count
  }, [search.search, search.zones])

  return {
    filters: {
      search: search.search ?? "",
      zones: search.zones ?? [],
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}