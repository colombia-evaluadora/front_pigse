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

import type { CampusFiltersFormInput } from "@/features/establishment/campuses/api/schema"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import { toSearchOptions, toSelectItemsMap } from "@/lib/catalog-options"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "campuses-search"

interface SearchCampusesProps {
  filters: CampusFiltersFormInput
  applyFilters: (values: CampusFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
  zones: CatalogItem[]
}

export function SearchCampuses({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  zones,
}: SearchCampusesProps) {
  const [open, setOpen] = useState(false)
  const [draftZone, setDraftZone] = useState(filters.zones[0] ?? "")

  // El filtro se escribe dentro del input —`zona:(Urbana)`— igual que en el
  // resto de los listados. Ver `@/components/search/query-syntax`.
  const syntax = useMemo<QuerySyntax<CampusFiltersFormInput>>(
    () => ({
      empty: { search: "", zones: [] },
      freeText: { key: "texto", field: "search" },
      terms: [
        optionsTerm("zona", "zones", toSearchOptions(zones)),
      ],
    }),
    [zones],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // El filtro avanzado (zona) se cuenta aparte del buscador para el badge.
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  // Reinicia el borrador cada vez que se abre el popover.
  useEffect(() => {
    if (open) setDraftZone(filters.zones[0] ?? "")
  }, [open, filters.zones])

  function handleApplyAdvanced() {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    applyFilters({ ...filters, search: freeText, zones: draftZone ? [draftZone] : [] })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const zoneItems = [{ value: "", label: "Todas" }, ...toSearchOptions(zones)]

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
            <FieldLabel htmlFor="campus-zone">Zona</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(zoneItems)}
              value={draftZone}
              onValueChange={(value) => setDraftZone(value ?? "")}
            >
              <ComboboxFieldTrigger id="campus-zone" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todas" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {zoneItems.map((item) => (
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
