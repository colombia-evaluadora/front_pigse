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

import { useEstablishmentsFilters } from "@/features/establishment/institution/hooks/use-filters"
import { useEstablishmentsQuery } from "@/features/establishment/institution/api/query/use-establishments"
import {
  useBulkDelete,
  summarizeEstablishmentBulkDelete,
} from "@/features/establishment/institution/api/mutations/use-bulk-delete"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/types/catalog"
import { CATALOGS } from "@/lib/catalogs"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import type { Establishment } from "@/features/establishment/institution/api/types/establishment"
import { columns } from "@/features/establishment/institution/components/table/columns-establishments"
import { DialogBulkDelete } from "@/features/establishment/employees/components/dialogs/dialog-bulk-delete"
import { ClearSelectionDialog } from "@/features/establishment/employees/components/dialogs/dialog-clear-selection"
import { ExportEstablishmentsDialog } from "@/features/establishment/institution/components/dialogs/dialog-export"
import { ExportSelectedEstablishmentsDialog } from "@/features/establishment/institution/components/dialogs/dialog-export-selected"
import { SearchEstablishments } from "@/features/establishment/institution/components/search/search-establishments"
import { useNotify } from "@/components/notice/notice-context"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface EstablishmentsDataTableProps {
  title: ReactNode
  // Acción principal de la página (ej. "Agregar"). Se renderiza dentro de la
  // barra de herramientas, no en el encabezado, para que baje junto al
  // buscador.
  action?: ReactNode
}

export function EstablishmentsDataTable({ title, action }: EstablishmentsDataTableProps) {
  const { notify } = useNotify()
  const { puedeEliminar } = useMenuPermission("ESTABLECIMIENTO")
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useEstablishmentsFilters()

  const { data: entityStatuses = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ENTITY_STATUSES)
  /**
   * El catálogo de estados es compartido entre features y viene con etiqueta
   * neutra ("Activo"). En esta tabla los establecimientos se filtran con
   * femenino ("Activa"), así que ajustamos solo el `name` al renderizar sin
   * tocar el `code` (que en real es "A"/"I"/"S"/"SC"/"ST" — el código real
   * de `ESTADO_ESTABLECIMIENTO` — y en mock sigue siendo "ACTIVE"; el `id`
   * de este catálogo es un correlativo interno, no el discriminador de
   * estado).
   */
  const establishmentStatuses = useMemo(
    () =>
      entityStatuses.map((status) =>
        status.code === "ACTIVE" || status.code === "A" ? { ...status, name: "Activa" } : status,
      ),
    [entityStatuses],
  )

  // `queryFilters.status` ya trae el `id` (como texto, ver
  // search-establishments.tsx) — `useEstablishmentsQuery` solo necesita
  // convertirlo a número, no resolverlo contra ningún catálogo.
  const { data, isPending, isError, refetch } = useEstablishmentsQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

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
  const namesById = useMemo(() => new Map(rows.map((row) => [String(row.id), row.name])), [rows])

  const bulkDelete = useBulkDelete({
    mutationConfig: {
      onSuccess: (result) => {
        const summary = summarizeEstablishmentBulkDelete(result)
        if (summary.failed.length === 0) {
          notify(SUCCESS_MESSAGES.establishment.deletedMany(summary.succeededCount))
          resetSelection()
          return
        }
        const failedNames = summary.failed
          .map(({ id, reason }) => `${namesById.get(id) ?? id} (${reason})`)
          .join(", ")
        notify(
          summary.succeededCount > 0
            ? `Se eliminaron ${summary.succeededCount} establecimiento(s). No se pudo con: ${failedNames}.`
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
          <SearchEstablishments
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            statuses={establishmentStatuses}
          />

          <TableScreenActions>
            {action}
            {hasSelection ? (
              <>
                <ClearSelectionDialog resetSelection={resetSelection} />
                {puedeEliminar ? (
                  <DialogBulkDelete<Establishment, number>
                    items={selectedItems}
                    getItemId={(item) => item.id}
                    getItemLabel={(item) => item.name}
                    title="Eliminar"
                    buildDescription={(count, sample) => {
                      const list = sample.join(", ")
                      const suffix = count > sample.length ? ` y ${count - sample.length} más` : ""
                      return `Se eliminarán permanentemente los establecimientos educativos ${list}${suffix} (${count} en total). Esta acción no se puede deshacer.`
                    }}
                    onConfirm={async (ids) => {
                      await bulkDelete.mutateAsync(ids)
                    }}
                    triggerLabel={`Eliminar (${selectedIds.length})`}
                  />
                ) : null}
                <ExportSelectedEstablishmentsDialog
                  selectedIds={selectedItems.map((item) => item.id)}
                  resetSelection={resetSelection}
                />
              </>
            ) : (
              <ExportEstablishmentsDialog filters={queryFilters} />
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
          errorMessage="Ocurrió un error al cargar los establecimientos."
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
