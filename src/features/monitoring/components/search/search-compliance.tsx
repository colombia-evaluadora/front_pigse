import { useEffect, useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { optionTerm, optionsTerm, type QueryOption, type QuerySyntax } from "@/components/search/query-syntax"
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
import {
  ESTADO_FILTER_OPTIONS,
  ETNIAS_FILTER_OPTIONS,
  PLAZO_FILTER_OPTIONS,
} from "@/features/monitoring/api/ui-mappings"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "compliance-search"

/**
 * Estados por tipo: el `status` clásico más el `estado` derivado de V523
 * (Parcial / Sin cargar). El backend compara contra ambos (V524).
 */
const ESTADO_OPTIONS: QueryOption[] = ESTADO_FILTER_OPTIONS
const PLAZO_OPTIONS: QueryOption[] = PLAZO_FILTER_OPTIONS
const ETNIAS_OPTIONS: QueryOption[] = ETNIAS_FILTER_OPTIONS

const withTodos = (options: QueryOption[]) => [{ value: "", label: "Todos" }, ...options]

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
 * Los cuatro filtros avanzados —PEI, PEC, PMI, PFI— responden a la pregunta
 * real del monitor: "¿quién me debe el PMI?". Buscar por nombre sirve para ir
 * a un EE puntual; filtrar por estado sirve para trabajar la lista de
 * pendientes.
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
  const [draftPfi, setDraftPfi] = useState(filters.pfi[0] ?? "")
  const [draftPlazo, setDraftPlazo] = useState(filters.plazo[0] ?? "")
  const [draftEtnias, setDraftEtnias] = useState(filters.etnias)

  const syntax = useMemo<QuerySyntax<ComplianceFilters>>(
    () => ({
      empty: { search: "", pei: [], pec: [], pmi: [], pfi: [], plazo: [], etnias: "" },
      freeText: { key: "texto", field: "search" },
      terms: [
        optionsTerm("pei", "pei", ESTADO_OPTIONS),
        optionsTerm("pec", "pec", ESTADO_OPTIONS),
        optionsTerm("pmi", "pmi", ESTADO_OPTIONS),
        optionsTerm("pfi", "pfi", ESTADO_OPTIONS),
        optionsTerm("plazo", "plazo", PLAZO_OPTIONS),
        optionTerm("tipo", "etnias", ETNIAS_OPTIONS),
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
    setDraftPfi(filters.pfi[0] ?? "")
    setDraftPlazo(filters.plazo[0] ?? "")
    setDraftEtnias(filters.etnias)
  }, [open, filters.pei, filters.pec, filters.pmi, filters.pfi, filters.plazo, filters.etnias])

  function handleApplyAdvanced() {
    // El popover no toca la búsqueda libre: reescribe el resto de la consulta
    // y conserva lo que el usuario venía escribiendo.
    applyFilters({
      ...filters,
      search: freeText,
      pei: draftPei ? [draftPei] : [],
      pec: draftPec ? [draftPec] : [],
      pmi: draftPmi ? [draftPmi] : [],
      pfi: draftPfi ? [draftPfi] : [],
      plazo: draftPlazo ? [draftPlazo] : [],
      etnias: draftEtnias,
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
        placeholder="Buscar establecimiento, código DANE o municipio"
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
        <div className="grid gap-3 px-4 sm:grid-cols-2">
          <EstadoField
            id="compliance-plazo"
            label="Plazo"
            value={draftPlazo}
            onChange={setDraftPlazo}
            options={PLAZO_OPTIONS}
          />
          <EstadoField
            id="compliance-etnias"
            label="Tipo de establecimiento"
            value={draftEtnias}
            onChange={setDraftEtnias}
            options={ETNIAS_OPTIONS}
          />
          <EstadoField
            id="compliance-pei"
            label="Estado PEI"
            value={draftPei}
            onChange={setDraftPei}
            options={ESTADO_OPTIONS}
          />
          <EstadoField
            id="compliance-pec"
            label="Estado PEC"
            value={draftPec}
            onChange={setDraftPec}
            options={ESTADO_OPTIONS}
          />
          <EstadoField
            id="compliance-pmi"
            label="Estado PMI"
            value={draftPmi}
            onChange={setDraftPmi}
            options={ESTADO_OPTIONS}
          />
          <EstadoField
            id="compliance-pfi"
            label="Estado PFI"
            value={draftPfi}
            onChange={setDraftPfi}
            options={ESTADO_OPTIONS}
          />
        </div>
      </SearchQueryBar>
    </div>
  )
}

/** Los selectores son idénticos salvo etiqueta y opciones: se arman una vez. */
function EstadoField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  options: QueryOption[]
}) {
  const items = withTodos(options)
  return (
    <Field orientation="vertical" variant="outlined" className="gap-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <ComboboxField
        items={toSelectItemsMap(items)}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
      >
        <ComboboxFieldTrigger id={id} size="sm" className="w-full">
          <ComboboxFieldValue placeholder="Todos" />
        </ComboboxFieldTrigger>
        <ComboboxFieldContent>
          {items.map((item) => (
            <ComboboxFieldItem key={item.value} value={item.value}>
              {item.label}
            </ComboboxFieldItem>
          ))}
        </ComboboxFieldContent>
      </ComboboxField>
    </Field>
  )
}
