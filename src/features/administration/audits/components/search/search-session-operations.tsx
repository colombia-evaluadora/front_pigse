import { useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"

import type {
  SessionOperationsFiltersFormInput,
  SessionOperationsFiltersFormValues,
} from "@/features/administration/audits/api/schema"
import { useAuditOperationTypesQuery } from "@/features/administration/audits/api/query/use-audit-operation-types-query"
import { FilterSessionOperationsForm } from "@/features/administration/audits/components/forms/form-filter-session-operations"
import { sessionOperationsSyntax } from "@/features/administration/audits/components/search/query-syntax"

const FILTER_SESSION_OPERATIONS_FORM_ID = "filter-session-operations-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "session-operations-search"

interface SearchSessionOperationsProps {
  activeFilterCount: number
  filters: SessionOperationsFiltersFormInput
  applyFilters: (values: SessionOperationsFiltersFormValues) => void
  clearAllFilters: () => void
}

export function SearchSessionOperations({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchSessionOperationsProps) {
  const [open, setOpen] = useState(false)

  const { data: operationOptions = [] } = useAuditOperationTypesQuery()

  const syntax = useMemo(
    () =>
      sessionOperationsSyntax(
        operationOptions.map((option) => ({ value: option.key, label: option.label })),
      ),
    [operationOptions],
  )

  // El input contiene la consulta entera —términos `clave:(valor)` más la
  // tabla, que es la búsqueda libre—. Ver `query-syntax.ts`.
  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // `filters` viene de la URL. El buscador de tabla se cuenta aparte del
  // badge del botón de filtros.
  const advancedFilterCount = activeFilterCount - (filters.tableSlug ? 1 : 0)

  function handleApplyAdvanced(values: SessionOperationsFiltersFormValues) {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    applyFilters({ ...values, tableSlug: freeText })
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
        formId={FILTER_SESSION_OPERATIONS_FORM_ID}
      >
        <FilterSessionOperationsForm
          id={FILTER_SESSION_OPERATIONS_FORM_ID}
          defaultValues={filters}
          onSubmit={handleApplyAdvanced}
          hideTableSlug
        />
      </SearchQueryBar>
    </div>
  )
}
