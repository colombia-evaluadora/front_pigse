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

const SEARCH_INPUT_ID = "documents-search"

const TYPE_OPTIONS: QueryOption[] = [
  { value: "PEI", label: "PEI" },
  { value: "PEC", label: "PEC" },
  { value: "PMI", label: "PMI" },
]

const STATUS_OPTIONS: QueryOption[] = [
  { value: "COMPLETO", label: "Completo" },
  { value: "PENDIENTE", label: "Pendiente" },
  { value: "NO_APLICA", label: "No aplica" },
]

const TYPE_ITEMS = [{ value: "", label: "Todos" }, ...TYPE_OPTIONS]
const STATUS_ITEMS = [{ value: "", label: "Todos" }, ...STATUS_OPTIONS]

export interface DocumentsFilters {
  search: string
  type: string[]
  status: string[]
}

interface SearchDocumentsProps {
  filters: DocumentsFilters
  applyFilters: (values: DocumentsFilters) => void
  clearAllFilters: () => void
  activeFilterCount: number
}

/**
 * Buscador de "Gestión documental" (vista de todas las instituciones), con
 * el mismo contrato que el resto de los listados (Funcionarios, Sedes,
 * Monitoreo y Cumplimiento): texto libre + filtros avanzados en un mismo
 * `SearchQueryBar`, en vez del `<input>` de texto libre a secas que tenía
 * antes. Tipo/Estado responden a `pigse.fn_documentos_listar_todos_paginado`
 * (V374).
 */
export function SearchDocuments({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
}: SearchDocumentsProps) {
  const [open, setOpen] = useState(false)
  const [draftType, setDraftType] = useState(filters.type[0] ?? "")
  const [draftStatus, setDraftStatus] = useState(filters.status[0] ?? "")

  const syntax = useMemo<QuerySyntax<DocumentsFilters>>(
    () => ({
      empty: { search: "", type: [], status: [] },
      freeText: { key: "texto", field: "search" },
      terms: [
        optionsTerm("tipo", "type", TYPE_OPTIONS),
        optionsTerm("estado", "status", STATUS_OPTIONS),
      ],
    }),
    [],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  useEffect(() => {
    if (!open) return
    setDraftType(filters.type[0] ?? "")
    setDraftStatus(filters.status[0] ?? "")
  }, [open, filters.type, filters.status])

  function handleApplyAdvanced() {
    applyFilters({
      ...filters,
      search: freeText,
      type: draftType ? [draftType] : [],
      status: draftStatus ? [draftStatus] : [],
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
        <div className="grid gap-3 px-4 sm:grid-cols-2">
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="documents-type">Tipo</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(TYPE_ITEMS)}
              value={draftType}
              onValueChange={(value) => setDraftType(value ?? "")}
            >
              <ComboboxFieldTrigger id="documents-type" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {TYPE_ITEMS.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor="documents-status">Estado</FieldLabel>
            <ComboboxField
              items={toSelectItemsMap(STATUS_ITEMS)}
              value={draftStatus}
              onValueChange={(value) => setDraftStatus(value ?? "")}
            >
              <ComboboxFieldTrigger id="documents-status" size="sm" className="w-full">
                <ComboboxFieldValue placeholder="Todos" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {STATUS_ITEMS.map((item) => (
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
