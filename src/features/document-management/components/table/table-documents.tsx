"use no memo"

import { useEffect, useMemo, useState } from "react"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { DataTable } from "@/components/data-table"
import { Pagination } from "@/components/pagination"
import { useDataTable } from "@/hooks/use-data-table"
import { TablePaginationProvider, useTablePagination } from "@/hooks/use-table-pagination"
import { useUser } from "@/lib/auth"
import { canWriteDocuments } from "@/lib/auth-routes"
import { hasAnyRole, PIGSE_ROLES } from "@/lib/auth-mapper"

import { useDocumentsQuery, useAllDocumentsQuery } from "@/features/document-management/api/query/use-documents"
import { columns as ownColumns, allInstitutionsColumns } from "@/features/document-management/components/table/columns-documents"

/** Roles de fiscalización (V368): ven el estado documental de TODAS las
 * instituciones, no solo la propia — mismo criterio que ya tienen para
 * auditoría (V358) y para "Roles y Menús" (V364). */
const ALL_INSTITUTIONS_ROLES = [PIGSE_ROLES.Administrador, PIGSE_ROLES.SecretariaTerritorial]

export function DocumentManagementTable() {
  const userQuery = useUser()
  const seeAllInstitutions = hasAnyRole(userQuery.data, ALL_INSTITUTIONS_ROLES)

  return seeAllInstitutions ? (
    <TablePaginationProvider defaultPageSize={10}>
      <AllInstitutionsDocumentsTable />
    </TablePaginationProvider>
  ) : (
    <OwnEstablishmentDocumentsTable />
  )
}

/**
 * Vista de un solo EE (Rector/Secretario sobre su propio establecimiento):
 * solo dos o tres filas (PEI/PEC/PMI), sin paginación, sin buscador. El
 * Rector entra en modo lectura (se oculta la columna de acción); Secretario
 * conserva el flujo completo.
 */
function OwnEstablishmentDocumentsTable() {
  const { data: documents = [], isPending, isError, refetch } = useDocumentsQuery()

  const establishmentName = documents.find((d) => d.establishmentName)?.establishmentName
  const userQuery = useUser()

  const isReadOnly = !canWriteDocuments(userQuery.data)
  const columns = useMemo(
    () => (isReadOnly ? ownColumns.filter((column) => column.id !== "singleAction") : ownColumns),
    [isReadOnly],
  )

  const { table } = useDataTable({
    columns,
    data: documents,
    pageCount: 1,
    pageIndex: 0,
    pageSize: documents.length || 10,
    goToPage: () => {},
    setPageSize: () => {},
    sorting: [],
    setSorting: () => {},
    getRowId: (row) => row.id,
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Cargue y consulte sus documentos institucionales">
          Gestión documental
        </TableScreenTitle>
        <div className="border-b border-border bg-muted/10 px-(--screen-spacing) py-3">
          <p className="m-0! text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {establishmentName ? `${establishmentName} · ` : ""}Detalle documentos
          </p>
        </div>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="No hay documentos institucionales configurados."
          errorMessage="Ocurrió un error al cargar los documentos institucionales."
        />
      </TableScreenBody>
    </TableScreen>
  )
}

/**
 * Vista de PIGSE-ADMINISTRADOR/PIGSE-SECRETARIA_TERRITORIAL: documentos de
 * TODAS las instituciones, con su nombre, paginado y buscado en el
 * SERVIDOR (V368) — no en el cliente (ver `table-compliance.tsx` para el
 * mismo criterio ya aplicado en Monitoreo y Cumplimiento). Es una vista de
 * fiscalización, de solo lectura: no ofrece subir/eliminar por otra
 * institución.
 */
function AllInstitutionsDocumentsTable() {
  const { pageIndex, pageSize, goToPage, setPageSize, sorting, setSorting } = useTablePagination()
  const [search, setSearch] = useState("")

  const { data, isPending, isError, refetch } = useAllDocumentsQuery(
    { search, sorting, pageIndex, pageSize },
    true,
  )

  // Buscar reinicia a la primera pagina -- la que estaba puede no existir
  // mas del lado del servidor con el nuevo filtro.
  useEffect(() => {
    goToPage(0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const rows = data?.rows ?? []

  const { table } = useDataTable({
    columns: allInstitutionsColumns,
    data: rows,
    pageCount: data?.pageCount ?? -1,
    pageIndex,
    pageSize,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
    // `row.id` (el tipo: PEI/PEC/PMI) se repite entre instituciones -- acá
    // hay que sumarle el nombre de la institucion para que sea unico.
    getRowId: (row) => `${row.establishmentName}-${row.id}`,
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Estado de entrega documental (PEI/PEC/PMI) de todas las instituciones">
          Gestión documental
        </TableScreenTitle>
        <TableScreenToolbar>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar institución..."
            className="h-9 w-64 rounded-md border border-input bg-background px-3 text-sm"
          />
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="No hay instituciones registradas."
          errorMessage="Ocurrió un error al cargar los documentos institucionales."
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
