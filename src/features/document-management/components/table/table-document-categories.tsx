"use no memo"

import { Link } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { paths } from "@/config/paths"
import { useUser } from "@/lib/auth"
import { canWriteDocuments } from "@/lib/auth-routes"

import { useDocumentCategoriesQuery } from "@/features/document-management/api/query/use-document-categories"
import {
  documentCategoryColumns,
  documentCategoryReadOnlyColumns,
} from "@/features/document-management/components/table/columns-document-categories"
import { documentTypeDisplayName } from "@/features/document-management/api/types/document"
import type { DocumentType } from "@/features/document-management/api/types/document"

interface DocumentCategoriesTableProps {
  type: DocumentType
}

/**
 * Anexos de un PEI o PEC puntual (V512) — 5 filas fijas, misma tabla que
 * "Detalle documentos" pero acotada a este tipo. `type` viene de la URL
 * (`/gestion-documental/:tipo`, ver `paths.ts`); PMI no navega acá (sigue
 * siendo un solo archivo, ver `columns-documents.tsx`).
 */
export function DocumentCategoriesTable({ type }: DocumentCategoriesTableProps) {
  const { data: categories = [], isPending, isError, refetch } = useDocumentCategoriesQuery(type)
  const userQuery = useUser()
  const isReadOnly = !canWriteDocuments(userQuery.data)

  const { table } = useDataTable({
    columns: isReadOnly ? documentCategoryReadOnlyColumns : documentCategoryColumns,
    data: categories,
    pageCount: 1,
    pageIndex: 0,
    pageSize: categories.length || 10,
    goToPage: () => {},
    setPageSize: () => {},
    sorting: [],
    setSorting: () => {},
    getRowId: (row) => row.id,
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          description={`Anexos de ${documentTypeDisplayName(type).toLowerCase()}`}
          action={
            <Button
              variant="outline"
              color="neutral"
              size="sm"
              render={<Link to={paths.app.gestionDocumental.getHref()} />}
              nativeButton={false}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Volver
            </Button>
          }
        >
          {documentTypeDisplayName(type)}
        </TableScreenTitle>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="No hay anexos configurados."
          errorMessage="Ocurrió un error al cargar los anexos."
        />
      </TableScreenBody>
    </TableScreen>
  )
}
