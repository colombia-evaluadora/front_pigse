import { useMemo, useState } from "react"

import { SearchQueryBar } from "@/components/search/search-query-bar"
import { useQuerySearch } from "@/components/search/use-query-search"

import type {
  UserActivityFiltersFormInput,
  UserActivityFiltersFormValues,
} from "@/features/administration/user-activity/api/schema"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import {
  USER_ACTIVITY_STATUSES,
  type UserActivityStatus,
} from "@/features/administration/user-activity/api/types/user-activity"
import { USER_ACTIVITY_STATUS_LABELS } from "@/features/administration/user-activity/api/ui-mappings"
import { FilterUserActivityForm } from "@/features/administration/user-activity/components/forms/form-filter-user-activity"
import { userActivitySyntax } from "@/features/administration/user-activity/components/search/query-syntax"

const FILTER_USER_ACTIVITY_FORM_ID = "filter-user-activity-form"
const SEARCH_INPUT_ID = "user-activity-search"

interface SearchUserActivityProps {
  activeFilterCount: number
  filters: UserActivityFiltersFormInput
  applyFilters: (values: UserActivityFiltersFormValues) => void
  clearAllFilters: () => void
}

const STATUS_OPTIONS = USER_ACTIVITY_STATUSES.map((estado: UserActivityStatus) => ({
  value: estado,
  label: USER_ACTIVITY_STATUS_LABELS[estado],
}))

export function SearchUserActivity({
  activeFilterCount,
  filters,
  applyFilters,
  clearAllFilters,
}: SearchUserActivityProps) {
  const [open, setOpen] = useState(false)

  const { data: establishments = [] } = useEstablishmentsOptionsQuery()
  const establishmentOptions = useMemo(
    () => establishments.map((establishment) => ({ value: String(establishment.id), label: establishment.name })),
    [establishments],
  )

  const syntax = useMemo(
    () => userActivitySyntax(STATUS_OPTIONS, establishmentOptions),
    [establishmentOptions],
  )

  const { search, setSearch, freeText } = useQuerySearch({ syntax, filters, applyFilters })

  // El buscador de texto libre se cuenta aparte del badge del embudo.
  const advancedFilterCount = activeFilterCount - (filters.search ? 1 : 0)

  function handleApplyAdvanced(values: UserActivityFiltersFormValues) {
    applyFilters({ ...values, search: freeText })
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
        placeholder="Buscar por nombre, documento, correo o establecimiento"
        value={search}
        onValueChange={setSearch}
        onClearAll={handleClearAll}
        activeFilterCount={activeFilterCount}
        badgeCount={advancedFilterCount}
        open={open}
        onOpenChange={setOpen}
        formId={FILTER_USER_ACTIVITY_FORM_ID}
      >
        <FilterUserActivityForm
          id={FILTER_USER_ACTIVITY_FORM_ID}
          defaultValues={filters}
          onSubmit={handleApplyAdvanced}
        />
      </SearchQueryBar>
    </div>
  )
}
