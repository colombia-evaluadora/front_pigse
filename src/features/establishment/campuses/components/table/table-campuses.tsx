"use no memo"

import { useMemo, type ReactNode } from "react"

import { DataTable, DataTableViewOptions } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { useTablePagination } from "@/hooks/use-table-pagination"
import { getErrorMessage } from "@/lib/api-client"
import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"

import { useCampusesFilters } from "@/features/establishment/campuses/hooks/use-filters"
import { useCampusesQuery } from "@/features/establishment/campuses/api/query/use-campuses"
import {
  useBulkDelete,
  summarizeCampusBulkDelete,
} from "@/features/establishment/campuses/api/mutations/use-bulk-delete"
import { createColumns } from "@/features/establishment/campuses/components/table/columns-campuses"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"
import type { Campus } from "@/features/establishment/campuses/api/types/campus"
import { CATALOGS } from "@/lib/catalogs"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { DialogBulkDelete } from "@/features/establishment/employees/components/dialogs/dialog-bulk-delete"
import { ClearSelectionDialog } from "@/features/establishment/employees/components/dialogs/dialog-clear-selection"
import { ExportCampusesDialog } from "@/features/establishment/campuses/components/dialogs/dialog-export"
import { ExportSelectedCampusesDialog } from "@/features/establishment/campuses/components/dialogs/dialog-export-selected"
import { SearchCampuses } from "@/features/establishment/campuses/components/search/search-campuses"
import { useNotify } from "@/components/notice/notice-context"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface CampusesDataTableProps {
  onEditCampus: (campusId: number) => void
  title: ReactNode
  // Acción principal de la página (ej. "Agregar"). Va en la barra de
  // herramientas, junto al buscador, no en el encabezado.
  action?: ReactNode
}

export function CampusesDataTable({ onEditCampus, title, action }: CampusesDataTableProps) {
  const { notify } = useNotify()
  const { puedeEliminar } = useMenuPermission("SEDES_EDUCATIVAS")
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useCampusesFilters()

  const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)

  const { data, isPending, isError, refetch } = useCampusesQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const columns = useMemo(() => createColumns({ onEdit: onEditCampus }), [onEditCampus])

  const { table, selectedIds, hasSelection, resetSelection } = useDataTable({
    columns,
    data: data?.rows ?? [],
    pageCount: data?.pageCount ?? -1,
    // `getRowId` de TanStack Table siempre devuelve string; el `id` real de
    // la fila es number, así que se convierte solo para la selección.
    getRowId: (row) => String(row.id),
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  })

  const rows = data?.rows ?? []
  const selectedItems = useMemo(
    () => rows.filter((row) => selectedIds.includes(String(row.id))),
    [rows, selectedIds],
  )
  const namesById = useMemo(
    () => new Map(rows.map((row) => [String(row.id), row.name])),
    [rows],
  )

  const bulkDelete = useBulkDelete({
    mutationConfig: {
      onSuccess: (result) => {
        const summary = summarizeCampusBulkDelete(result)
        if (summary.failed.length === 0) {
          notify(SUCCESS_MESSAGES.campus.deletedMany(summary.succeededCount))
          resetSelection()
          return
        }
        const failedNames = summary.failed
          .map(({ id, reason }) => `${namesById.get(id) ?? id} (${reason})`)
          .join(", ")
        notify(
          summary.succeededCount > 0
            ? `Se eliminaron ${summary.succeededCount} sede(s). No se pudo con: ${failedNames}.`
            : `No se pudo eliminar: ${failedNames}.`,
          { variant: "error" },
        )
        resetSelection()
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle>{title}</TableScreenTitle>
        <TableScreenToolbar>
          <SearchCampuses
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            zones={zones}
          />

          <TableScreenActions>
            {action}
            {hasSelection ? (
              <>
                <ClearSelectionDialog resetSelection={resetSelection} />
                {puedeEliminar ? (
                  <DialogBulkDelete<Campus, number>
                    items={selectedItems}
                    getItemId={(item) => item.id}
                    getItemLabel={(item) => item.name}
                    title="Eliminar"
                    buildDescription={(count, sample) => {
                      const list = sample.join(", ")
                      const suffix = count > sample.length ? ` y ${count - sample.length} más` : ""
                      return `Se eliminarán permanentemente las sedes educativas ${list}${suffix} (${count} en total). Esta acción no se puede deshacer.`
                    }}
                    onConfirm={async (ids) => {
                      await bulkDelete.mutateAsync(ids)
                    }}
                    triggerLabel={`Eliminar (${selectedIds.length})`}
                  />
                ) : null}
                <ExportSelectedCampusesDialog
                  selectedIds={selectedItems.map((item) => item.id)}
                  resetSelection={resetSelection}
                />
              </>
            ) : (
              <ExportCampusesDialog filters={queryFilters} />
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
          errorMessage="Ocurrió un error al cargar las sedes."
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
