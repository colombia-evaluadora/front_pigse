import { useEffect, useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionsTerm, type QueryOption, type QuerySyntax } from "@/components/search/query-syntax"
import { useQuerySearch } from "@/components/search/use-query-search"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { toSelectItemsMap } from "@/lib/catalog-options"

import type { ComplianceFilters } from "@/features/monitoring/api/types/compliance"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "compliance-search"

/**
 * Estados posibles de un documento en el tablero.
 *
 * Van hardcodeados y no salen de un catálogo del backend porque no son un
 * catálogo: los produce el `CASE` de `fn_pigse_cumplimiento_listar()`, que es
 * código, no datos. Si alguna vez se agrega un cuarto estado hay que tocar
 * esta lista igual que el `switch` de `ui-mappings.ts`.
 */
const ESTADO_OPTIONS: QueryOption[] = [
  { value: "COMPLETO", label: "Completo" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "NO_APLICA", label: "No aplica" },
]

const TODOS_ITEMS = [{ value: "", label: "Todos" }, ...ESTADO_OPTIONS]

interface SearchComplianceProps {
  filters: ComplianceFilters
  applyFilters: (values: ComplianceFilters) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/**
 * Buscador del tablero de monitoreo, con el mismo contrato que el resto de
 * los listados: el texto libre y los filtros avanzados conviven en UN input
 * (`pmi:(Pendiente) valledupar`), y el popover del embudo es solo otra forma
 * de escribir lo mismo.
 *
 * Los tres filtros avanzados —PEI, PEC, PMI— responden a la pregunta real del
 * monitor: "¿quién me debe el PMI?". Buscar por nombre sirve para ir a un EE
 * puntual; filtrar por estado sirve para trabajar la lista de pendientes.
 */
export function SearchCompliance({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
}: SearchComplianceProps) {
  const [open, setOpen] = useState(false)
  const [draftPei, setDraftPei] = useState(filters.pei[0] ?? "")
  const [draftPec, setDraftPec] = useState(filters.pec[0] ?? "")
  const [draftPmi, setDraftPmi] = useState(filters.pmi[0] ?? "")

  const syntax = useMemo<QuerySyntax<ComplianceFilters>>(
    () => ({
      empty: { search: "", pei: [], pec: [], pmi: [] },
      freeText: { key: "texto", field: "search" },
      terms: [
        optionsTerm("pei", "pei", ESTADO_OPTIONS),
        optionsTerm("pec", "pec", ESTADO_OPTIONS),
        optionsTerm("pmi", "pmi", ESTADO_OPTIONS),
      ],
    }),
    [],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // Los avanzados se cuentan aparte del texto libre: ese es el número del
  // badge del embudo.
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  // Reinicia los borradores cada vez que se abre el popover, para que no
  // arrastre lo que se tipeó y no se aplicó la vez anterior.
  useEffect(() => {
    if (!open) return
    setDraftPei(filters.pei[0] ?? "")
    setDraftPec(filters.pec[0] ?? "")
    setDraftPmi(filters.pmi[0] ?? "")
  }, [open, filters.pei, filters.pec, filters.pmi])

  function handleApplyAdvanced() {
    // El popover no toca la búsqueda libre: reescribe el resto de la consulta
    // y conserva lo que el usuario venía escribiendo.
    applyFilters({
      ...filters,
      search: freeText,
      pei: draftPei ? [draftPei] : [],
      pec: draftPec ? [draftPec] : [],
      pmi: draftPmi ? [draftPmi] : [],
    })
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
        onApply={handleApplyAdvanced}
        size="sm"
      >
        <div className="grid gap-3 px-4 sm:grid-cols-3">
          <EstadoField
            id="compliance-pei"
            label="Estado PEI"
            value={draftPei}
            onChange={setDraftPei}
          />
          <EstadoField
            id="compliance-pec"
            label="Estado PEC"
            value={draftPec}
            onChange={setDraftPec}
          />
          <EstadoField
            id="compliance-pmi"
            label="Estado PMI"
            value={draftPmi}
            onChange={setDraftPmi}
          />
        </div>
      </SearchQueryBar>
    </div>
  )
}

/** Los tres selectores son idénticos salvo la etiqueta: se arman una vez. */
function EstadoField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ComboboxField
        items={toSelectItemsMap(TODOS_ITEMS)}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
      >
        <ComboboxFieldTrigger id={id} size="sm" className="w-full">
          <ComboboxFieldValue placeholder="Todos" />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {TODOS_ITEMS.map((item) => (
            <ComboboxFieldItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
    </Field>
  )
}
