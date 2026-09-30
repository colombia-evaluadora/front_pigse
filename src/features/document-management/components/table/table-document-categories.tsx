"use no memo"

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
import { UploadDocumentCategoryDialog } from "@/features/document-management/components/dialogs/dialog-upload-document-category"
import {
  documentTypeDisplayName,
  documentCategoryDisplayName,
} from "@/features/document-management/api/types/document"
import type { DocumentCategory, DocumentType } from "@/features/document-management/api/types/document"

interface DocumentCategoriesTableProps {
  type: DocumentType
}

/**
 * Anexos de un tipo puntual (V521: los 4 tipos van por categorías) —
 * misma tabla que "Detalle documentos" pero acotada a este tipo. `type`
 * viene de la URL (`/gestion-documental/:tipo`, ver `paths.ts`).
 */
export function DocumentCategoriesTable({ type }: DocumentCategoriesTableProps) {
  const { data: categories = [], isPending, isError, refetch } = useDocumentCategoriesQuery(type)
  const userQuery = useUser()
  const isReadOnly = !canWriteDocuments(userQuery.data)

  // "Plan de estudios" (V515) es EXCLUSIVA de PEI/PEC -- PMI/PFI solo
  // tienen "Autoevaluación institucional" (V521), que sigue el patrón de
  // un archivo por categoría (Subir/Eliminar resuelve en
  // `columns-document-categories.tsx`, no acá).
  const tienePlanEstudios = type === "PEI" || type === "PEC"

  // "Plan de estudios" (V515) admite varios archivos a la vez: a diferencia
  // de las otras 4 categorías, nunca deja de ofrecer "Agregar" solo porque
  // ya tenga uno cargado — por eso este botón vive afuera de la tabla
  // (la fila de acción de cada categoría de un solo archivo sigue
  // resolviendo Subir/Eliminar como siempre, ver `columns-document-categories.tsx`).
  // Si el tipo no aplica para este EE (NO_APLICA), ninguna fila ofrece
  // acción — ni esta.
  const planEstudiosNoAplica = categories.some(
    (c) => c.categoria === "PLAN_ESTUDIOS" && c.status === "NO_APLICA",
  )
  const planEstudiosAddTarget: DocumentCategory = {
    id: "plan-estudios-agregar",
    type,
    typeName: documentTypeDisplayName(type),
    categoria: "PLAN_ESTUDIOS",
    categoriaName: documentCategoryDisplayName("PLAN_ESTUDIOS"),
    status: "PENDIENTE",
    fileName: null,
    uploadedAt: null,
    sizeBytes: null,
    archivoId: null,
    downloadUrl: null,
  }

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
        {!isReadOnly && tienePlanEstudios && !planEstudiosNoAplica && (
          <TableScreenToolbar>
            <span />
            <TableScreenActions>
              <UploadDocumentCategoryDialog
                category={planEstudiosAddTarget}
                triggerLabel="Agregar a Plan de estudios"
                alwaysAdds
              />
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
          errorMessage="Ocurrió un error al cargar los anexos."
        />
      </TableScreenBody>
    </TableScreen>
  )
}
