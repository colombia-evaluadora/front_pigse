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
          roles: values.roles.length ? values.roles : undefined,
          workSchedules: values.workSchedules.length ? values.workSchedules : undefined,
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
        roles: undefined,
        workSchedules: undefined,
        statuses: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters = useMemo(
    () => ({
      search: search.search,
      roles: search.roles,
      workSchedules: search.workSchedules,
      statuses: search.statuses,
    }),
    [search.roles, search.search, search.statuses, search.workSchedules],
  )

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (search.search) count += 1
    count += search.roles?.length ?? 0
    count += search.workSchedules?.length ?? 0
    count += search.statuses?.length ?? 0
    return count
  }, [search.roles, search.search, search.statuses, search.workSchedules])

  return {
    filters: {
      search: search.search ?? "",
      roles: search.roles ?? [],
      workSchedules: search.workSchedules ?? [],
      statuses: search.statuses ?? [],
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
