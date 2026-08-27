import { useEffect, useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionsTerm, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"

import type { EstablishmentFiltersFormInput } from "@/features/establishment/institution/api/schema"
import type { CatalogItem } from "@/types/catalog"
import { toSearchOptions, toSelectItemsMap } from "@/lib/catalog-options"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "establishments-search"

interface SearchEstablishmentsProps {
  filters: EstablishmentFiltersFormInput
  applyFilters: (values: EstablishmentFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
  statuses: CatalogItem[]
}

export function SearchEstablishments({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  statuses,
}: SearchEstablishmentsProps) {
  const [open, setOpen] = useState(false)
  const [draftStatus, setDraftStatus] = useState<string>(filters.statuses[0] ?? "")

  // El filtro se escribe dentro del input —`estado:(Activo)`— igual que en el
  // resto de los listados. Ver `@/components/search/query-syntax`.
  const syntax = useMemo<QuerySyntax<EstablishmentFiltersFormInput>>(
    () => ({
      empty: { search: "", statuses: [] },
      freeText: { key: "texto", field: "search" },
      terms: [optionsTerm("estado", "statuses", toSearchOptions(statuses))],
    }),
    [statuses],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // El filtro avanzado (estado) se cuenta aparte del buscador para el badge.
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  // Reinicia el borrador cada vez que se abre el popover.
  useEffect(() => {
    if (open) setDraftStatus(filters.statuses[0] ?? "")
  }, [open, filters.statuses])

  function handleApplyAdvanced() {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    applyFilters({
      ...filters,
      search: freeText,
      statuses: draftStatus ? [draftStatus] : [],
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const statusItems = [{ value: "", label: "Todos" }, ...toSearchOptions(statuses)]

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
        onApply={handleApplyAdvanced}
        size="sm"
      >
        {/* Un solo control: sin `FieldSet`, porque el título de la sección
            repetiría la etiqueta del campo. */}
        <div className="px-4">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="establishment-status">Estado</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(statusItems)}
              value={draftStatus}
              onValueChange={(value) => setDraftStatus(value ?? "")}
            >
              <ComboboxFieldTrigger id="establishment-status" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {statusItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>
        </div>
      </SearchQueryBar>
    </div>
  )
}
