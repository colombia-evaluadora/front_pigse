"use no memo"

import { useEffect, useMemo, useState } from "react"

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
 * Normaliza para comparar: sin mayúsculas y sin tildes.
 *
 * Hace falta lo segundo porque los nombres de los EE vienen de la base con su
 * acentuación real ("Institución Educativa San José") y nadie los escribe con
 * tildes en un buscador. Sin esto, buscar "jose" no encuentra "José".
 */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

/**
 * Tablero "Monitoreo y cumplimiento institucional": KPIs globales de
 * entrega documental (PEI / PEC / PMI) arriba y detalle por EE abajo.
 *
 * El bloque de métricas NO es sticky a propósito: cuando el usuario scrollea
 * el listado, las tarjetas se van con el contenido en lugar de quedar pegadas
 * arriba comiéndose el viewport.
 *
 * **Filtro y paginación son del CLIENTE, no del servidor.**
 * `GET /pigse/cumplimiento/listar` devuelve el universo entero de una
 * (`fn_pigse_cumplimiento_listar()` no recibe parámetros ni pagina), así que
 * las filas ya están todas en memoria: pedirle otra página al backend sería
 * un round-trip para reordenar datos que ya tenemos.
 *
 * Por lo mismo la paginación va por `TablePaginationProvider` (estado local) y
 * no por los search params de la URL: la variante de URL exige declarar un
 * `validateSearch` en la ruta, y acá no hay nada que compartir por link —
 * el filtro es una ayuda de lectura sobre un dato que llega completo.
 */
export function MonitoringComplianceTable() {
  return (
    <TablePaginationProvider defaultPageSize={10}>
      <MonitoringComplianceTableContent />
    </TablePaginationProvider>
  )
}

function MonitoringComplianceTableContent() {
  const { data: rows = [], isPending, isError, refetch } = useComplianceRowsQuery()
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const [filters, setFilters] = useState<ComplianceFilters>(EMPTY_COMPLIANCE_FILTERS)

  // Cuántos filtros hay puestos: alimenta el badge del embudo y decide si el
  // buscador muestra el botón de "limpiar todo".
  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.pei.length ? 1 : 0) +
    (filters.pec.length ? 1 : 0) +
    (filters.pmi.length ? 1 : 0)

  const filtradas = useMemo(() => {
    const termino = normalizar(filters.search.trim())
    // Un filtro vacío no filtra. Uno con valor exige coincidencia exacta de
    // estado; los tres se combinan con Y (un EE tiene que cumplir todos).
    const coincideEstado = (elegidos: string[], estado: string) =>
      elegidos.length === 0 || elegidos.includes(estado)

    return rows.filter(
      (row) =>
        (!termino || normalizar(row.establishmentName).includes(termino)) &&
        coincideEstado(filters.pei, row.pei.status) &&
        coincideEstado(filters.pec, row.pec.status) &&
        coincideEstado(filters.pmi, row.pmi.status),
    )
  }, [rows, filters])

  // Al filtrar, la página en la que estaba el usuario puede no existir más
  // (filtrar 50 EE a 3 deja una sola página). Sin esto la tabla se queda en
  // una página vacía y parece que el filtro no encontró nada.
  useEffect(() => {
    goToPage(0)
  }, [filters, goToPage])

  const pageCount = Math.max(1, Math.ceil(filtradas.length / pageSize))
  const paginaActual = Math.min(pageIndex, pageCount - 1)
  const visibles = useMemo(
    () => filtradas.slice(paginaActual * pageSize, paginaActual * pageSize + pageSize),
    [filtradas, paginaActual, pageSize],
  )

  const { table } = useDataTable({
    columns,
    data: visibles,
    pageCount,
    pageIndex: paginaActual,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    getRowId: (row) => String(row.id),
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
          pageIndex={paginaActual}
          pageCount={pageCount}
          canPrev={paginaActual > 0}
          canNext={paginaActual < pageCount - 1}
          totalCount={filtradas.length}
          pageSize={pageSize}
          onPageChange={goToPage}
          onPageSizeChange={setPageSize}
        />
      </TableScreenBody>
    </TableScreen>
  )
}

export type { ComplianceRow }
