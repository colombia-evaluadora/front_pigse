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
import { toSelectItemsMap } from "@/lib/catalog-options"

import type { EmployeeFiltersFormInput } from "@/features/establishment/employees/api/schema"
import type { EmployeeStatus } from "@/features/establishment/employees/api/types/employee"
import type { CatalogItem } from "@/types/catalog"

// El `htmlFor` de la etiqueta necesita un id estable en el control.
const SEARCH_INPUT_ID = "employees-search"

/**
 * Rol y jornada se filtran por NOMBRE, no por `code`: `pigse.fn_fun_listar`
 * (V386) compara contra `public.role.name` y `TLISTA_VALOR.NOMBRE`. Por eso
 * acá no sirve `toSearchOptions` (que usa el código) — y además el catálogo
 * propio de roles de PIGSE ni siquiera garantiza tener uno.
 */
function toNameOptions(items: CatalogItem[]) {
  return items.map((item) => ({ value: item.name, label: item.name }))
}

interface SearchEmployeesProps {
  filters: EmployeeFiltersFormInput
  applyFilters: (values: EmployeeFiltersFormInput) => void
  clearAllFilters: () => void
  activeFilterCount: number
  roles: CatalogItem[]
  workSchedules: CatalogItem[]
  // No es `CatalogItem[]`: no sale de un catálogo real (ver
  // EMPLOYEE_STATUS_OPTIONS en ui-mappings.ts), así que no lleva `id`.
  statuses: { code: string; name: string }[]
}

export function SearchEmployees({
  filters,
  applyFilters,
  clearAllFilters,
  activeFilterCount,
  roles,
  workSchedules,
  statuses,
}: SearchEmployeesProps) {
  const [open, setOpen] = useState(false)
  const [draftRole, setDraftRole] = useState(filters.roles[0] ?? "")
  const [draftSchedule, setDraftSchedule] = useState(filters.workSchedules[0] ?? "")
  const [draftStatus, setDraftStatus] = useState<string>(filters.statuses[0] ?? "")

  // Los filtros se escriben dentro del input —`rol:(Docente)`— igual que en
  // el resto de los listados. Ver `@/components/search/query-syntax`.
  const syntax = useMemo<QuerySyntax<EmployeeFiltersFormInput>>(
    () => ({
      empty: { search: "", roles: [], workSchedules: [], statuses: [] },
      freeText: { key: "texto", field: "search" },
      terms: [
        optionsTerm("rol", "roles", toNameOptions(roles)),
        optionsTerm("jornada", "workSchedules", toNameOptions(workSchedules)),
        optionsTerm(
          "estado",
          "statuses",
          statuses.map((status) => ({ value: status.code, label: status.name })),
        ),
      ],
    }),
    [roles, workSchedules, statuses],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // Los filtros avanzados (rol, jornada, estado) se cuentan aparte del
  // buscador para el badge del botón.
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  // Reinicia el borrador cada vez que se abre el popover.
  useEffect(() => {
    if (open) {
      setDraftRole(filters.roles[0] ?? "")
      setDraftSchedule(filters.workSchedules[0] ?? "")
      setDraftStatus(filters.statuses[0] ?? "")
    }
  }, [open, filters.roles, filters.workSchedules, filters.statuses])

  function handleApplyAdvanced() {
    // El popover no toca la búsqueda libre; el resto de la consulta se
    // reescribe y el buscador la vuelca al input.
    applyFilters({
      ...filters,
      search: freeText,
      roles: draftRole ? [draftRole] : [],
      workSchedules: draftSchedule ? [draftSchedule] : [],
      statuses: draftStatus ? [draftStatus as EmployeeStatus] : [],
    })
    setOpen(false)
  }

  function handleClearAll() {
    clearAllFilters()
    setSearch("")
    setOpen(false)
  }

  const roleItems = [{ value: "", label: "Todos" }, ...toNameOptions(roles)]
  const scheduleItems = [{ value: "", label: "Todas" }, ...toNameOptions(workSchedules)]
  const statusItems = [
    { value: "", label: "Todos" },
    ...statuses.map((status) => ({ value: status.code, label: status.name })),
  ]

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
      >
        {/* Los tres son atributos del funcionario y sus etiquetas ya se
            explican solas: una leyenda encima sería un título inventado.
            Van en rejilla, no separados por líneas. */}
        <div className="px-4">
          <div className="grid grid-cols-3 gap-3">
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="employee-role">Rol</FieldLabel>
              <ComboboxField
                items={toSelectItemsMap(roleItems)}
                value={draftRole}
                onValueChange={(value) => setDraftRole(value ?? "")}
              >
                <ComboboxFieldTrigger id="employee-role" size="sm" className="w-full">
                  <ComboboxFieldValue placeholder="Todos" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {roleItems.map((item) => (
                    <ComboboxFieldItem key={item.value} value={item.value} title={item.label}>
                      {item.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>

            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="employee-schedule">Jornada</FieldLabel>
              <ComboboxField
                items={toSelectItemsMap(scheduleItems)}
                value={draftSchedule}
                onValueChange={(value) => setDraftSchedule(value ?? "")}
              >
                <ComboboxFieldTrigger id="employee-schedule" size="sm" className="w-full">
                  <ComboboxFieldValue placeholder="Todas" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {scheduleItems.map((item) => (
                    <ComboboxFieldItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>

            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor="employee-status">Estado</FieldLabel>
              <ComboboxField
                items={toSelectItemsMap(statusItems)}
                value={draftStatus}
                onValueChange={(value) => setDraftStatus(value ?? "")}
              >
                <ComboboxFieldTrigger id="employee-status" size="sm" className="w-full">
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
        </div>
      </SearchQueryBar>
    </div>
  )
}
