import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"

import type { DocumentCategory } from "@/features/document-management/api/types/document"

import { isDocumentActionable } from "@/features/document-management/api/ui-mappings"
import { StatusIndicator } from "@/features/document-management/components/table/status-indicator"
import { UploadDocumentCategoryDialog } from "@/features/document-management/components/dialogs/dialog-upload-document-category"
import { DeleteDocumentCategoryDialog } from "@/features/document-management/components/dialogs/dialog-delete-document-category"
import { CategoryFileActions } from "@/features/document-management/components/table/category-file-actions"

const categoryColumn: ColumnDef<DocumentCategory> = {
  accessorKey: "categoriaName",
  id: "categoriaName",
  meta: { label: "Anexo" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Anexo" />,
  cell: ({ row }) => <span className="text-pretty font-medium">{row.original.categoriaName}</span>,
  enableSorting: false,
}

const statusColumn: ColumnDef<DocumentCategory> = {
  accessorKey: "status",
  id: "status",
  meta: { label: "Estado de Entrega" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Estado de Entrega" />,
  cell: ({ row }) => <StatusIndicator status={row.original.status} />,
  enableSorting: false,
}

const fileColumn: ColumnDef<DocumentCategory> = {
  id: "archivo",
  accessorKey: "fileName",
  meta: { label: "Archivo" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Archivo" />,
  cell: ({ row }) => <CategoryFileActions category={row.original} />,
  enableSorting: false,
}

/** Mismo criterio "una sola acción según el estado" que `columns-documents.tsx`. */
const actionColumn: ColumnDef<DocumentCategory> = {
  id: "singleAction",
  accessorKey: "status",
  meta: { label: "Acción" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Acción" />,
  cell: ({ row }) => {
    const category = row.original
    if (!isDocumentActionable(category.status)) return null

    const isPending = category.status === "PENDIENTE"
    return (
      <div className="flex items-center justify-end">
        {isPending ? (
          <UploadDocumentCategoryDialog category={category} />
        ) : (
          <DeleteDocumentCategoryDialog category={category} />
        )}
      </div>
    )
  },
  enableSorting: false,
  enableHiding: false,
  size: 160,
}

export const documentCategoryColumns: ColumnDef<DocumentCategory>[] = [
  categoryColumn,
  statusColumn,
  fileColumn,
  actionColumn,
]

/** Vista de solo lectura (Rector, o fiscalización): sin columna de acción. */
export const documentCategoryReadOnlyColumns: ColumnDef<DocumentCategory>[] = [
  categoryColumn,
  statusColumn,
  fileColumn,
]
