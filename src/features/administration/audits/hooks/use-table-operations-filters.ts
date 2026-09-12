import { useCallback, useMemo } from "react"

import { auditoriaTablaDetalleRoute } from "@/router"

import type {
  TableOperationsFiltersFormInput,
  TableOperationsFiltersFormValues,
} from "@/features/administration/audits/api/schema"
import type { TableOperationsQueryRequest } from "@/features/administration/audits/api/types/audit-table"

export interface TableOperationsFilters {
  filters: TableOperationsFiltersFormInput
  queryFilters: TableOperationsQueryRequest["filters"]
  applyFilters: (values: TableOperationsFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useTableOperationsFilters(): TableOperationsFilters {
  const search = auditoriaTablaDetalleRoute.useSearch()
  const navigate = auditoriaTablaDetalleRoute.useNavigate()

  const applyFilters = useCallback(
    (values: TableOperationsFiltersFormValues) => {
      navigate({
        search: (prev) => ({
          ...prev,
          author_ip: values.author || undefined,
          operations: values.operations.length ? values.operations : undefined,
          occurredFrom: values.occurredFrom || undefined,
          occurredTo: values.occurredTo || undefined,
          fieldFilters: values.fieldFilters.length ? values.fieldFilters : undefined,
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
        author_ip: undefined,
        operations: undefined,
        occurredFrom: undefined,
        occurredTo: undefined,
        fieldFilters: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  // Puertas adentro (form, request al backend) el filtro sigue llamándose
  // `author`; `author_ip` es el nombre del parámetro en la URL.
  const queryFilters: TableOperationsQueryRequest["filters"] = useMemo(
    () => ({
      author: search.author_ip,
      operations: search.operations,
      occurredFrom: search.occurredFrom,
      occurredTo: search.occurredTo,
      fieldFilters: search.fieldFilters,
    }),
    [
      search.author_ip,
      search.operations,
      search.occurredFrom,
      search.occurredTo,
      search.fieldFilters,
    ],
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.author_ip) n += 1
    n += search.operations?.length ?? 0
    if (search.occurredFrom || search.occurredTo) n += 1
    n += search.fieldFilters?.length ?? 0
    return n
  }, [
    search.author_ip,
    search.operations,
    search.occurredFrom,
    search.occurredTo,
    search.fieldFilters,
  ])

  return {
    filters: {
      author: search.author_ip ?? "",
      operations: search.operations ?? [],
      occurredFrom: search.occurredFrom ?? "",
      occurredTo: search.occurredTo ?? "",
      fieldFilters: search.fieldFilters ?? [],
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
