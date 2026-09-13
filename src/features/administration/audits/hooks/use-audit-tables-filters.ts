import { useCallback, useMemo } from "react"

import { auditoriaTablasRoute } from "@/router"

import type { AuditTablesFiltersFormInput, AuditTablesFiltersFormValues } from "@/features/administration/audits/api/schema"
import type { AuditTablesQueryRequest } from "@/features/administration/audits/api/types/audit-table"

export interface AuditTablesFilters {
  filters: AuditTablesFiltersFormInput
  queryFilters: AuditTablesQueryRequest["filters"]
  applyFilters: (values: AuditTablesFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useAuditTablesFilters(): AuditTablesFilters {
  const search = auditoriaTablasRoute.useSearch()
  const navigate = auditoriaTablasRoute.useNavigate()

  const applyFilters = useCallback(
    (values: AuditTablesFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          name: values.name || undefined,
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
        name: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: AuditTablesQueryRequest["filters"] = useMemo(
    () => ({
      name: search.name,
    }),
    [search.name],
  )

  const activeFilterCount = useMemo(() => (search.name ? 1 : 0), [search.name])

  return {
    filters: {
      name: search.name ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
