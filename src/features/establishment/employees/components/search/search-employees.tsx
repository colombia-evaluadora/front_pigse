import { useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"
import type { QuerySyntax } from "@/components/search/query-syntax"

import type { EmployeeFiltersFormInput } from "@/features/establishment/employees/api/schema"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "employees-search"

interface SearchEmployeesProps {
  filters: EmployeeFiltersFormInput
  applyFilters: (values: EmployeeFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/**
 * PIGSE, a diferencia de CEVAL, no tiene rol/jornada/estado como filtros de
 * este listado: `pigse.fn_fun_listar` solo acepta texto libre (nombre,
 * documento, correo o establecimiento) — ver `use-employees.ts`. El popover
 * de filtros avanzados queda sin campos (`children` vacío) porque
 * `SearchQueryBar` lo exige, pero acá no hay nada que filtrar aparte del
 * texto.
 */
export function SearchEmployees({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
}: SearchEmployeesProps) {
  const [open, setOpen] = useState(false)

  const syntax: QuerySyntax<EmployeeFiltersFormInput> = {
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
      >
        <p className="px-4 py-2 text-sm text-muted-foreground">
          No hay filtros adicionales para este listado.
        </p>
      </SearchQueryBar>
    </div>
  )
}
