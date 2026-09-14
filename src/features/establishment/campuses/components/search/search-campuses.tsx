import { useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"
import type { QuerySyntax } from "@/components/search/query-syntax"

import type { CampusFiltersFormInput } from "@/features/establishment/campuses/api/schema"

const SEARCH_INPUT_ID = "campuses-search"

interface SearchCampusesProps {
  filters: CampusFiltersFormInput
  applyFilters: (values: CampusFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/**
 * `pigse.fn_sed_listar` solo acepta texto libre (nombre/código de sede) --
 * a diferencia de CEVAL, no hay filtro por zona registrado.
 */
export function SearchCampuses({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
}: SearchCampusesProps) {
  const [open, setOpen] = useState(false)

  const syntax: QuerySyntax<CampusFiltersFormInput> = {
    empty: { search: "" },
    freeText: { key: "texto", field: "search" },
    terms: [],
  }

  const { search, setSearch } = useQuerySearch({ syntax, filters, applyFilters })

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <SearchQueryBar
        id={SEARCH_INPUT_ID}
        placeholder="Buscar por"
        value={search}
        onValueChange={setSearch}
        onClearAll={clearAllFilters}
        activeFilterCount={activeFilterCount}
        badgeCount={0}
        open={open}
        onOpenChange={setOpen}
        size="sm"
      >
        <p className="px-4 py-2 text-sm text-muted-foreground">
          No hay filtros adicionales para este listado.
        </p>
      </SearchQueryBar>
    </div>
  )
}
