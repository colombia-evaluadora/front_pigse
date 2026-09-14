"use no memo"

import { useMemo, type ReactNode } from "react"

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
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"

import { useEmployeesFilters } from "@/features/establishment/employees/hooks/use-filters"
import type { EmployeeListItem } from "@/features/establishment/employees/api/types/employee"
import { useEmployeesQuery } from "@/features/establishment/employees/api/query/use-employees"
import { useEmployeeRolesQuery } from "@/features/establishment/employees/api/query/use-employee-roles"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { EMPLOYEE_STATUS_OPTIONS } from "@/features/establishment/employees/api/ui-mappings"
import { CATALOGS } from "@/lib/catalogs"
import type { CatalogItem } from "@/types/catalog"
import {
  useBulkDelete,
  summarizeEmployeeBulkDelete,
} from "@/features/establishment/employees/api/mutations/use-bulk-delete"
import { createColumns } from "@/features/establishment/employees/components/table/columns-employees"
import { DialogBulkDelete } from "@/features/establishment/employees/components/dialogs/dialog-bulk-delete"
import { ClearSelectionDialog } from "@/features/establishment/employees/components/dialogs/dialog-clear-selection"
import { ExportEmployeesDialog } from "@/features/establishment/employees/components/dialogs/dialog-export"
import { ExportSelectedEmployeesDialog } from "@/features/establishment/employees/components/dialogs/dialog-export-selected"
import { SearchEmployees } from "@/features/establishment/employees/components/search/search-employees"
import { useNotify } from "@/components/notice/notice-context"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface EmployeesDataTableProps {
  onEditEmployee: (employeeId: number) => void
  title: ReactNode
  // Acción principal de la página (ej. "Agregar"). Va en la barra de
  // herramientas, junto al buscador, no en el encabezado.
  action?: ReactNode
}

export function EmployeesDataTable({ onEditEmployee, title, action }: EmployeesDataTableProps) {
  const { notify } = useNotify()
  const { puedeEliminar } = useMenuPermission("FUNCIONARIOS")
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()

  const { filters, queryFilters, applyFilters, clearAllFilters, activeFilterCount } =
    useEmployeesFilters()

  // Las mismas fuentes que el formulario de alta/edición y su sub-diálogo de
  // permisos: roles de la tabla propia de PIGSE (TROL, no TLISTA_VALOR) y
  // jornadas del catálogo genérico.
  const { data: roles = [] } = useEmployeeRolesQuery()
  const { data: workSchedules = [] } = useCatalogQuery<CatalogItem>(CATALOGS.WORK_SCHEDULES)

  const { data, isPending, isError, refetch } = useEmployeesQuery({
    filters: queryFilters,
    sorting,
    pageIndex,
    pageSize,
  })

  const columns = useMemo(() => createColumns({ onEdit: onEditEmployee }), [onEditEmployee])

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
        const summary = summarizeEmployeeBulkDelete(result)
        if (summary.failed.length === 0) {
          notify(SUCCESS_MESSAGES.employee.deletedMany(summary.succeededCount))
          resetSelection()
          return
        }
        const failedNames = summary.failed
          .map(({ id, reason }) => `${namesById.get(id) ?? id} (${reason})`)
          .join(", ")
        notify(
          summary.succeededCount > 0
            ? `Se eliminaron ${summary.succeededCount} funcionario(s). No se pudo con: ${failedNames}.`
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
          <SearchEmployees
            filters={filters}
            applyFilters={applyFilters}
            clearAllFilters={clearAllFilters}
            activeFilterCount={activeFilterCount}
            roles={roles}
            workSchedules={workSchedules}
            statuses={EMPLOYEE_STATUS_OPTIONS}
          />

          <TableScreenActions>
            {action}
            {hasSelection ? (
              <>
                <ClearSelectionDialog resetSelection={resetSelection} />
                {puedeEliminar ? (
                  <DialogBulkDelete<EmployeeListItem, number>
                    items={selectedItems}
                    getItemId={(item) => item.id}
                    getItemLabel={(item) => item.name}
                    title="Eliminar"
                    buildDescription={(count, sample) => {
                      const list = sample.join(", ")
                      const suffix = count > sample.length ? ` y ${count - sample.length} más` : ""
                      return `Se eliminarán permanentemente los funcionarios ${list}${suffix} (${count} en total). Esta acción no se puede deshacer.`
                    }}
                    onConfirm={async (ids) => {
                      await bulkDelete.mutateAsync(ids)
                    }}
                    triggerLabel={`Eliminar (${selectedIds.length})`}
                  />
                ) : null}
                <ExportSelectedEmployeesDialog
                  selectedIds={selectedItems.map((item) => item.id)}
                  resetSelection={resetSelection}
                />
              </>
            ) : (
              <ExportEmployeesDialog filters={queryFilters} />
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
          errorMessage="Ocurrió un error al cargar los funcionarios."
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
