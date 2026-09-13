"use no memo"

import type { ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { useSessionOperationsQuery } from "@/features/administration/audits/api/query/use-session-operations-query"
import { useSessionOperationsFilters } from "@/features/administration/audits/hooks/use-session-operations-filters"

import { columns } from "@/features/administration/audits/components/table/columns-session-operations"
import { SearchSessionOperations } from "@/features/administration/audits/components/search/search-session-operations"
import { ExportSelectedSessionOperationsDialog } from "@/features/administration/audits/components/dialogs/dialog-export-selected-session-operations"
import { ExportSessionOperationsDialog } from "@/features/administration/audits/components/dialogs/dialog-export-session-operations"
import { ClearSelectionSessionOperationsDialog } from "@/features/administration/audits/components/dialogs/dialog-clear-selection-session-operations"

interface SessionOperationsDataTableProps {
  sessionId: string
  title: ReactNode
  // Acción de navegación del encabezado (ej. "Volver").
  action?: ReactNode
}

export function SessionOperationsDataTable({
  sessionId,
  title,
  action,
}: SessionOperationsDataTableProps) {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useSessionOperationsFilters()

  const { data, isPending, isError, refetch } = useSessionOperationsQuery({
    sessionId,
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    getRowId: (row) => row.id,
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
        <TableScreenTitle action={action}>{title}</TableScreenTitle>
        <TableScreenToolbar>
          <SearchSessionOperations
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />

          <TableScreenActions>
            {hasSelection ? (
              <>
                <ClearSelectionSessionOperationsDialog resetSelection={resetSelection} />
                <ExportSelectedSessionOperationsDialog
                  sessionId={sessionId}
                  selectedIds={selectedIds}
                  resetSelection={resetSelection}
                />
              </>
            ) : (
              <ExportSessionOperationsDialog sessionId={sessionId} />
            )}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="Sin resultados."
          errorMessage="Ocurrió un error al cargar las operaciones."
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
