"use no memo"

import { Link } from "@tanstack/react-router"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTabs,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { paths } from "@/config/paths"

import { useAuditsQuery } from "@/features/administration/audits/api/query/use-audits-query"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { useAuditSessionFilters } from "@/features/administration/audits/hooks/use-audit-session-filters"

import { columns } from "@/features/administration/audits/components/table/columns-audit-session"
import { SearchAuditSession } from "@/features/administration/audits/components/search/search-audit-session"
import { ExportSelectedAuditSessionDialog } from "@/features/administration/audits/components/dialogs/dialog-export-selected-audit-session"
import { ExportAuditSessionDialog } from "@/features/administration/audits/components/dialogs/dialog-export-audit-session"
import { ClearSelectionAuditSessionDialog } from "@/features/administration/audits/components/dialogs/dialog-clear-selection-audit-session"
import { AuditSessionStatsCards } from "@/features/administration/audits/components/stats/audit-session-stats-cards"

const viewLinks = [
  { label: "Por sesión", to: paths.app.auditoriaSesiones.getHref() },
  { label: "Por tablas", to: paths.app.auditoriaTablas.getHref() },
]

export function AuditSessionDataTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useAuditSessionFilters()
  const { data, isPending, isError, refetch } = useAuditsQuery({
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
        <TableScreenTitle>Sesiones de auditoría</TableScreenTitle>

        <TableScreenTabs>
          <nav aria-label="Vistas de auditoría" className="flex items-end gap-1">
            {viewLinks.map((view) => (
              <Link
                key={view.to}
                to={view.to}
                activeProps={{ "data-active": "true" }}
                className="-mb-px rounded-t-lg border border-border border-b-border bg-muted/60 px-4 py-1.5 text-sm font-medium text-muted-foreground data-active:border-b-card data-active:bg-card data-active:text-foreground"
              >
                {view.label}
              </Link>
            ))}
          </nav>
        </TableScreenTabs>
        <TableScreenToolbar>
          <SearchAuditSession
            activeFilterCount={activeFilterCount}
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
          />

          <TableScreenActions>
            {hasSelection ? (
              <>
                <ClearSelectionAuditSessionDialog resetSelection={resetSelection} />
                <ExportSelectedAuditSessionDialog
                  selectedIds={selectedIds}
                  resetSelection={resetSelection}
                />
              </>
            ) : (
              <ExportAuditSessionDialog filters={queryFilters} />
            )}
          </TableScreenActions>
        </TableScreenToolbar>
      </TableScreenHeader>
      <TableScreenBody>
        <AuditSessionStatsCards
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
          errorMessage="Ocurrió un error al cargar las sesiones."
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
