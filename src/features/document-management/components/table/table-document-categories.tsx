"use no memo"

import { useState } from "react"
import { Link } from "@tanstack/react-router"

import {
  TableScreen,
  TableScreenActions,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { DataTable } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { ArrowLeftIcon, FileUploadOutlinedIcon, PencilIcon } from "@/components/ui/icons"
import { useDataTable } from "@/hooks/use-data-table"
import { paths } from "@/config/paths"
import { useUser } from "@/lib/auth"
import { canWriteDocuments } from "@/lib/auth-routes"

import { useDocumentCategoriesQuery } from "@/features/document-management/api/query/use-document-categories"
import { documentCategoryColumns } from "@/features/document-management/components/table/columns-document-categories"
import { DocumentFormDialog } from "@/features/document-management/components/dialogs/dialog-document-form"
import { missingAnnexesMessage } from "@/features/document-management/lib/document-file"
import {
  documentTypeDisplayName,
  requiredDocumentCategoriesForType,
} from "@/features/document-management/api/types/document"
import type { DocumentType } from "@/features/document-management/api/types/document"
import { getErrorMessage } from "@/lib/api-client"

interface DocumentCategoriesTableProps {
  type: DocumentType
}

/**
 * Anexos de un tipo puntual (V521: los 4 tipos van por categorías) —
 * misma tabla que "Detalle documentos" pero acotada a este tipo. `type`
 * viene de la URL (`/gestion-documental/:tipo`, ver `paths.ts`).
 */
export function DocumentCategoriesTable({ type }: DocumentCategoriesTableProps) {
  const {
    data: categories = [],
    isPending,
    isError,
    error,
    refetch,
  } = useDocumentCategoriesQuery(type)
  const userQuery = useUser()
  const isReadOnly = !canWriteDocuments(userQuery.data)

  const [formOpen, setFormOpen] = useState(false)

  // Un tipo que no aplica a este EE (NO_APLICA) no ofrece carga.
  const noAplica = categories.some((c) => c.status === "NO_APLICA")
  const hasFiles = categories.some((c) => c.archivoId != null)
  // Documentos parciales que quedaron de antes del guardado "todo o nada":
  // se muestran tal cual; el próximo guardado obliga a completarlos.
  const missing = requiredDocumentCategoriesForType(type).filter(
    (categoria) => !categories.some((c) => c.categoria === categoria && c.archivoId != null),
  )
  const canEdit = !isReadOnly && !noAplica && !isPending && !isError

  const { table } = useDataTable({
    columns: documentCategoryColumns,
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
        {canEdit && (
          <TableScreenToolbar>
            <p className="m-0! text-sm text-muted-foreground">
              {missing.length > 0 && hasFiles
                ? `Documento incompleto. ${missingAnnexesMessage(missing)}`
                : missing.length > 0
                  ? "Adjunte todos los anexos obligatorios y guarde el documento completo."
                  : "Documento completo. Puede reemplazar anexos desde el formulario."}
            </p>
            <TableScreenActions>
              <Button
                variant="fill"
                color="primary"
                size="sm"
                type="button"
                onClick={() => setFormOpen(true)}
              >
                {hasFiles ? (
                  <PencilIcon data-icon="inline-start" />
                ) : (
                  <FileUploadOutlinedIcon data-icon="inline-start" />
                )}
                {hasFiles ? "Editar documento" : "Cargar documento"}
              </Button>
            </TableScreenActions>
          </TableScreenToolbar>
        )}
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="No hay anexos configurados."
          errorMessage={error ? getErrorMessage(error) : undefined}
        />
      </TableScreenBody>

      {canEdit && (
        <DocumentFormDialog
          type={type}
          categories={categories}
          open={formOpen}
          onOpenChange={setFormOpen}
        />
      )}
    </TableScreen>
  )
}
