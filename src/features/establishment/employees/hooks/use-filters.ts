import { useCallback, useMemo } from "react"

import { employeesRoute } from "@/router"

import type { EmployeeFiltersFormInput } from "@/features/establishment/employees/api/schema"
import type { EmployeesQueryRequest } from "@/features/establishment/employees/api/types/employee"

export interface EmployeesFilters {
  filters: EmployeeFiltersFormInput
  queryFilters: EmployeesQueryRequest["filters"]
  applyFilters: (values: EmployeeFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useEmployeesFilters(): EmployeesFilters {
  const search = employeesRoute.useSearch()
  const navigate = employeesRoute.useNavigate()

  const applyFilters = useCallback(
    (values: EmployeeFiltersFormInput) => {
      navigate({
        search: (prev) => ({
          ...prev,
          search: values.search || undefined,
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
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters = useMemo(
    () => ({
      search: search.search,
    }),
    [search.search],
  )

  const activeFilterCount = useMemo(() => {
    return search.search ? 1 : 0
  }, [search.search])

  return {
    filters: {
      search: search.search ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
