"use no memo"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"

import { useUserActivityQuery } from "@/features/administration/user-activity/api/query/use-user-activity-query"
import { useUserActivityFilters } from "@/features/administration/user-activity/hooks/use-user-activity-filters"
import { columns } from "@/features/administration/user-activity/components/table/columns-user-activity"
import { SearchUserActivity } from "@/features/administration/user-activity/components/search/search-user-activity"

/**
 * "Actividad de usuarios": una fila por (establecimiento, usuario PIGSE
 * activo) con su último ingreso/actividad y un badge de estado
 * (`CON_INGRESO`/`SIN_INGRESO`). Solo lectura — no hay
 * selección ni export, a diferencia de las tablas de auditoría, porque acá
 * no hay nada que exportar todavía (ver `use-user-activity-query.ts`).
 */
export function UserActivityDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useUserActivityFilters()
  const { data, isPending, isError, refetch } = useUserActivityQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => `${row.usuarioId}-${row.establecimientoId ?? "sin-ee"}`,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>Actividad de usuarios</TableScreenTitle>
        <TableScreenToolbar>
          <SearchUserActivity
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Sin resultados."
          errorMessage="Ocurrió un error al cargar la actividad de usuarios."
        />
        {data && (
          <Pagination
            viewOptions={<DataTableViewOptions table={table} />}
            pageIndex={pageIndex}
            pageCount={data.pageCount}
            canPrev={pageIndex > 0}
            canNext={pageIndex < data.pageCount - 1}
            onPageChange={goToPage}
            totalCount={data.totalCount}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          />
        )}
      </TableScreenBody>
    </TableScreen>
  )
}
