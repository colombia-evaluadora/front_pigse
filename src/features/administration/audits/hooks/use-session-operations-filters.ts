import { useCallback, useMemo } from "react"

import { auditoriaSesionOperacionesRoute } from "@/router"

import type {
  SessionOperationsFiltersFormInput,
  SessionOperationsFiltersFormValues,
} from "@/features/administration/audits/api/schema"
import type { SessionOperationsQueryRequest } from "@/features/administration/audits/api/types/audit"

export interface SessionOperationsFilters {
  filters: SessionOperationsFiltersFormInput
  queryFilters: SessionOperationsQueryRequest["filters"]
  applyFilters: (values: SessionOperationsFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useSessionOperationsFilters(): SessionOperationsFilters {
  const search = auditoriaSesionOperacionesRoute.useSearch()
  const navigate = auditoriaSesionOperacionesRoute.useNavigate()

  const applyFilters = useCallback(
    (values: SessionOperationsFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          operations: values.operations.length ? values.operations : undefined,
          tableSlug: values.tableSlug || undefined,
          occurredFrom: values.occurredFrom || undefined,
          occurredTo: values.occurredTo || undefined,
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
        operations: undefined,
        tableSlug: undefined,
        occurredFrom: undefined,
        occurredTo: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: SessionOperationsQueryRequest["filters"] = useMemo(
    () => ({
      operations: search.operations,
      tableSlug: search.tableSlug,
      occurredFrom: search.occurredFrom,
      occurredTo: search.occurredTo,
    }),
    [search.operations, search.tableSlug, search.occurredFrom, search.occurredTo],
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    n += search.operations?.length ?? 0
    if (search.tableSlug) n += 1
    if (search.occurredFrom || search.occurredTo) n += 1
    return n
  }, [search.operations, search.tableSlug, search.occurredFrom, search.occurredTo])

  return {
    filters: {
      operations: search.operations ?? [],
      tableSlug: search.tableSlug ?? "",
      occurredFrom: search.occurredFrom ?? "",
      occurredTo: search.occurredTo ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
