import { useCallback, useMemo } from "react"

import { establishmentsRoute } from "@/router"

import type { EstablishmentFiltersFormInput } from "@/features/establishment/institution/api/schema"
import type { EstablishmentsQueryRequest } from "@/features/establishment/institution/api/types/establishment"

export interface EstablishmentsFilters {
  filters: EstablishmentFiltersFormInput
  queryFilters: EstablishmentsQueryRequest["filters"]
  applyFilters: (values: EstablishmentFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useEstablishmentsFilters(): EstablishmentsFilters {
  const search = establishmentsRoute.useSearch()
  const navigate = establishmentsRoute.useNavigate()

  const applyFilters = useCallback(
    (values: EstablishmentFiltersFormInput) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: values.search || undefined,
          statuses: values.statuses.length ? values.statuses : undefined,
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
        statuses: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters = useMemo(
    () => ({
      search: search.search,
      status: search.statuses,
    }),
    [search.search, search.statuses],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.search) count += 1
    count += search.statuses?.length ?? 0
    return count
  }, [search.search, search.statuses])

  return {
    filters: {
      search: search.search ?? "",
      statuses: search.statuses ?? [],
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
