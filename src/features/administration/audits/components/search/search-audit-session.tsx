import { useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"

import type { AuditFiltersFormInput, AuditFiltersFormValues } from "@/features/administration/audits/api/schema"
import { useAuditSessionStatusesQuery } from "@/features/administration/audits/api/query/use-audit-session-statuses-query"
import { FilterAuditSessionForm } from "@/features/administration/audits/components/forms/form-filter-audit-session"
import { auditSessionsSyntax } from "@/features/administration/audits/components/search/query-syntax"

const FILTER_AUDIT_SESSION_FORM_ID = "filter-audit-session-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "audit-session-search"

interface SearchAuditSessionProps {
  activeFilterCount: number
  filters: AuditFiltersFormInput
  applyFilters: (values: AuditFiltersFormValues) => void
  clearAllFilters: () => void
}

export function SearchAuditSession({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchAuditSessionProps) {
  const [open, setOpen] = useState(false)

  const { data: statusOptions = [] } = useAuditSessionStatusesQuery()

  const syntax = useMemo(
    () =>
      auditSessionsSyntax(
        statusOptions.map((option) => ({ value: option.key, label: option.label })),
      ),
    [statusOptions],
  )

  // El input contiene la consulta entera —términos `clave:(valor)` más la
  // búsqueda libre—, no solo el autor. Ver `query-syntax.ts`.
  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // `filters` viene de la URL. El buscador de autor se cuenta aparte del
  // badge del botón de filtros.
  const advancedFilterCount = activeFilterCount - (filters.author ? 1 : 0)

  function handleApplyAdvanced(values: AuditFiltersFormValues) {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    applyFilters({ ...values, author: freeText })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        formId={FILTER_AUDIT_SESSION_FORM_ID}
      >
        <FilterAuditSessionForm
          id={FILTER_AUDIT_SESSION_FORM_ID}
          defaultValues={filters}
          onSubmit={handleApplyAdvanced}
          hideAuthor
        />
      </SearchQueryBar>
    </div>
  )
}
