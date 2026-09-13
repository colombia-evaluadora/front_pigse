import { useCallback, useMemo } from "react"

import { auditoriaSesionesRoute } from "@/router"

import type { AuditFiltersFormInput, AuditFiltersFormValues } from "@/features/administration/audits/api/schema"
import type { AuditsQueryRequest, SessionStatus } from "@/features/administration/audits/api/types/audit"

export interface AuditSessionFilters {
  filters: AuditFiltersFormInput
  queryFilters: AuditsQueryRequest["filters"]
  applyFilters: (values: AuditFiltersFormValues) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

export function useAuditSessionFilters(): AuditSessionFilters {
  const search = auditoriaSesionesRoute.useSearch()
  const navigate = auditoriaSesionesRoute.useNavigate()

  const applyFilters = useCallback(
    (values: AuditFiltersFormValues) => {
      // El form lleva un único `status`; la URL/serialización de la API
      // esperan un array. Convertimos en el borde: "" → undefined, valor →
      // array de un elemento.
      const status = values.status as SessionStatus | ""
      navigate({
        search: (prev) => ({
          ...prev,
          author: values.author || undefined,
          statuses: status ? [status] : undefined,
          startedFrom: values.startedFrom || undefined,
          startedTo: values.startedTo || undefined,
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
        author: undefined,
        statuses: undefined,
        startedFrom: undefined,
        startedTo: undefined,
        page: 0,
      }),
      replace: true,
    })
  }, [navigate])

  const queryFilters: AuditsQueryRequest["filters"] = useMemo(
    () => ({
      author: search.author,
      status: search.statuses,
      startedFrom: search.startedFrom,
      startedTo: search.startedTo,
    }),
    [search.author, search.statuses, search.startedFrom, search.startedTo],
  )

  const activeFilterCount = useMemo(() => {
    let n = 0
    if (search.author) n += 1
    n += search.statuses?.length ?? 0
    if (search.startedFrom || search.startedTo) n += 1
    return n
  }, [search.author, search.statuses, search.startedFrom, search.startedTo])

  return {
    // El form recibe un único `status`; el resto de campos pasan tal cual.
    filters: {
      author: search.author ?? "",
      status: search.statuses?.[0] ?? "",
      startedFrom: search.startedFrom ?? "",
      startedTo: search.startedTo ?? "",
    },
    queryFilters,
    applyFilters,
    clearAllFilters,
    activeFilterCount,
  }
}
