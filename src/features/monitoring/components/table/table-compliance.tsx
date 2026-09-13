"use no memo"

import { useEffect, useState } from "react"

import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"

import { useComplianceRowsQuery } from "@/features/monitoring/api/query/use-compliance"
import { columns } from "@/features/monitoring/components/table/columns-compliance"
import { ComplianceMetricsCards } from "@/features/monitoring/components/metrics-toolbar"
import { SearchCompliance } from "@/features/monitoring/components/search/search-compliance"
import {
  EMPTY_COMPLIANCE_FILTERS,
  type ComplianceFilters,
  type ComplianceRow,
} from "@/features/monitoring/api/types/compliance"

/**
 * Tablero "Monitoreo y cumplimiento institucional": KPIs globales de
 * entrega documental (PEI / PEC / PMI) arriba y detalle por EE abajo.
 *
 * El bloque de métricas NO es sticky a propósito: cuando el usuario scrollea
 * el listado, las tarjetas se van con el contenido en lugar de quedar pegadas
 * arriba comiéndose el viewport.
 *
 * **Filtro y paginación son del SERVIDOR** (`POST /cumplimiento/query`,
 * `fn_cumplimiento_listar_paginado`) — antes esta pantalla pedía el
 * universo entero con `GET /cumplimiento/listar` y paginaba/filtraba en el
 * cliente, lo que no escala con cientos de instituciones. Mismo patrón que
 * `use-campuses.ts`/`table-campuses.tsx`.
 */
export function MonitoringComplianceTable() {
  return (
    <TablePaginationProvider defaultPageSize={10}>
      <MonitoringComplianceTableContent />
    </TablePaginationProvider>
  )
}

function MonitoringComplianceTableContent() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const [filters, setFilters] = useState<ComplianceFilters>(EMPTY_COMPLIANCE_FILTERS)

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.pei.length ? 1 : 0) +
    (filters.pec.length ? 1 : 0) +
    (filters.pmi.length ? 1 : 0)

  const { data, isPending, isError, refetch } = useComplianceRowsQuery({
    filters,
    sorting,
    pageIndex,
    pageSize,
  })

  // Al cambiar el filtro, la pagina en la que estaba el usuario puede no
  // existir mas del lado del servidor (filtrar 50 EE a 3 deja una sola
  // pagina) -- sin esto la tabla pide una pagina vacia y parece que el
  // filtro no encontro nada.
  useEffect(() => {
    goToPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const rows = data?.rows ?? []

  const { table } = useDataTable({
    columns,
    data: rows,
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
        <TableScreenTitle description="Avance de entrega documental por establecimiento educativo.">
          Monitoreo y cumplimiento institucional
        </TableScreenTitle>
        <TableScreenToolbar>
          <SearchCompliance
            filters={filters}
            applyFilters={setFilters}
            clearAllFilters={() => setFilters(EMPTY_COMPLIANCE_FILTERS)}
            activeFilterCount={activeFilterCount}
          />
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <ComplianceMetricsCards />

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
          errorMessage="Ocurrió un error al cargar el detalle por establecimiento."
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
        />
      </TableScreenBody>
    </TableScreen>
  )
}

export type { ComplianceRow }
