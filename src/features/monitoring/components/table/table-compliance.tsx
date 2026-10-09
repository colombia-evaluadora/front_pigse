"use no memo"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { getErrorMessage } from "@/lib/api-client"

import { useComplianceRowsQuery } from "@/features/monitoring/api/query/use-compliance"
import { columns } from "@/features/monitoring/components/table/columns-compliance"
import { ComplianceMetricsCards } from "@/features/monitoring/components/metrics-toolbar"
import { QuickFilters } from "@/features/monitoring/components/quick-filters"
import { SearchCompliance } from "@/features/monitoring/components/search/search-compliance"
import { useComplianceFilters } from "@/features/monitoring/hooks/use-compliance-filters"
import type { ComplianceRow } from "@/features/monitoring/api/types/compliance"

/**
 * Tablero "Monitoreo y cumplimiento institucional": KPIs globales arriba y
 * detalle por EE abajo. Filtros, orden y paginación viven en la URL y se
 * resuelven en el SERVIDOR (`POST /cumplimiento/query`,
 * `fn_cumplimiento_listar_paginado`), así que al volver del detalle
 * documental de un EE la lista queda exactamente como estaba.
 */
export function MonitoringComplianceTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const { filters, applyFilters, clearAllFilters, activeFilterCount } = useComplianceFilters()

  const { data, isPending, isError, error, refetch } = useComplianceRowsQuery({
    filters,
    sorting,
    pageIndex,
    pageSize,
  })

  const { table } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    getRowId: (row: ComplianceRow) => String(row.id),
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Entrega documental (PEI/PEC y PMI/PFI) de cada establecimiento educativo, con su avance por anexos y el plazo vigente.">
          Monitoreo y cumplimiento institucional
        </TableScreenTitle>
        <TableScreenToolbar>
          <SearchCompliance
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
          />
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <ComplianceMetricsCards />

        <QuickFilters filters={filters} applyFilters={applyFilters} />

        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage={
            activeFilterCount > 0
              ? "Ningún establecimiento coincide con los filtros."
              : "No hay establecimientos educativos registrados."
          }
          errorMessage={error ? getErrorMessage(error) : undefined}
        />

        <Pagination
          pageIndex={pageIndex}
          pageCount={data?.pageCount ?? 1}
          canPrev={pageIndex > 0}
          canNext={pageIndex < (data?.pageCount ?? 1) - 1}
          totalCount={data?.totalCount ?? 0}
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
          viewOptions={<DataTableViewOptions table={table} />}
        />
      </TableScreenBody>
    </TableScreen>
  )
}
