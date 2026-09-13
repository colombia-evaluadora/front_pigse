"use no memo"

import { useMemo, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"

import { useTableOperationsQuery } from "@/features/administration/audits/api/query/use-table-operations-query"
import { useAuditTableQuery } from "@/features/administration/audits/api/query/use-audit-table-query"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { useTableOperationsFilters } from "@/features/administration/audits/hooks/use-table-operations-filters"

import { columns } from "@/features/administration/audits/components/table/columns-table-operations"
import { SearchTableOperations } from "@/features/administration/audits/components/search/search-table-operations"
import { ExportSelectedTableOperationsDialog } from "@/features/administration/audits/components/dialogs/dialog-export-selected-table-operations"
import { ExportTableOperationsDialog } from "@/features/administration/audits/components/dialogs/dialog-export-table-operations"
import { ClearSelectionTableOperationsDialog } from "@/features/administration/audits/components/dialogs/dialog-clear-selection-table-operations"
import { TableOperationsStatsCards } from "@/features/administration/audits/components/stats/table-operations-stats-cards"
import { useParams } from "@tanstack/react-router"

interface TableOperationsDataTableProps {
  title: ReactNode
  // Acción de navegación del encabezado (ej. "Volver").
  action?: ReactNode
}

export function TableOperationsDataTable({ title, action }: TableOperationsDataTableProps) {
  const { tableSlug } = useParams({ strict: false }) as { tableSlug: string }
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useTableOperationsFilters()
  const { data, isPending, isError, refetch } = useTableOperationsQuery({
    tableSlug,
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })
  const { data: auditTable } = useAuditTableQuery({ tableSlug })
  // El backend real no tiene catálogo de campos legibles por tabla (V85 lo
  // deja explícito como pendiente), así que `fields` viene vacío. En ese caso
  // se derivan de las columnas que realmente trae el snapshot de las
  // operaciones cargadas: son los nombres crudos de Postgres, pero permiten
  // que los filtros por campo del sheet sigan siendo utilizables.
  const availableFields = useMemo(() => {
    if (auditTable?.fields?.length) return auditTable.fields
    const fields = new Set<string>()
    for (const row of data?.rows ?? []) {
      for (const field of Object.keys(row.entityFields ?? {})) fields.add(field)
    }
    return [...fields].sort()
  }, [auditTable?.fields, data?.rows])

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
          <SearchTableOperations
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            availableFields={availableFields}
          />

          <TableScreenActions>
            {hasSelection ? (
              <>
                <ClearSelectionTableOperationsDialog resetSelection={resetSelection} />
                <ExportSelectedTableOperationsDialog
                  tableSlug={tableSlug}
                  selectedIds={selectedIds}
                  resetSelection={resetSelection}
                />
              </>
            ) : (
              <ExportTableOperationsDialog tableSlug={tableSlug} filters={queryFilters} />
            )}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <TableOperationsStatsCards
          tableSlug={tableSlug}
          selectedIds={selectedIds}
          hasSelection={hasSelection}
          filters={queryFilters}
        />
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
