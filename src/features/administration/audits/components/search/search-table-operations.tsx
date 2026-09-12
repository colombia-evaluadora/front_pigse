import { useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"

import type {
  TableOperationsFiltersFormInput,
  TableOperationsFiltersFormValues,
} from "@/features/administration/audits/api/schema"
import { useAuditOperationTypesQuery } from "@/features/administration/audits/api/query/use-audit-operation-types-query"
import { FilterTableOperationsForm } from "@/features/administration/audits/components/forms/form-filter-table-operations"
import { tableOperationsSyntax } from "@/features/administration/audits/components/search/query-syntax"

const FILTER_TABLE_OPERATIONS_FORM_ID = "filter-table-operations-form"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "table-operations-search"

interface SearchTableOperationsProps {
  activeFilterCount: number
  filters: TableOperationsFiltersFormInput
  applyFilters: (values: TableOperationsFiltersFormValues) => void
  clearAllFilters: () => void
  // Campos de la tabla auditada — se inyectan en el form para el dropdown
  // de filtros por campo.
  availableFields: string[]
}

export function SearchTableOperations({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
  availableFields,
}: SearchTableOperationsProps) {
  const [open, setOpen] = useState(false)

  const { data: operationOptions = [] } = useAuditOperationTypesQuery()

  const syntax = useMemo(
    () =>
      tableOperationsSyntax(
        operationOptions.map((option) => ({ value: option.key, label: option.label })),
      ),
    [operationOptions],
  )

  // El input contiene la consulta entera —términos `clave:(valor)` más la
  // búsqueda libre—, no solo el autor. Ver `query-syntax.ts`.
  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // `filters` viene de la URL. El buscador de autor se cuenta aparte del
  // badge del botón de filtros.
  const advancedFilterCount = activeFilterCount - (filters.author ? 1 : 0)

  function handleApplyAdvanced(values: TableOperationsFiltersFormValues) {
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
        formId={FILTER_TABLE_OPERATIONS_FORM_ID}
      >
        <FilterTableOperationsForm
          id={FILTER_TABLE_OPERATIONS_FORM_ID}
          defaultValues={filters}
          onSubmit={handleApplyAdvanced}
          availableFields={availableFields}
          hideAuthor
        />
      </SearchQueryBar>
    </div>
  )
}
