import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"

import type { DocumentCategory } from "@/features/document-management/api/types/document"

import { StatusIndicator } from "@/features/document-management/components/table/status-indicator"
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

/**
 * Sin columna de acción por fila: un anexo ya no se carga ni se elimina suelto
 * (V555.x, guardado "todo o nada"). La carga y la edición viven en el
 * formulario del documento completo (`DocumentFormDialog`), que abre el botón
 * de la cabecera de la tabla.
 */
export const documentCategoryColumns: ColumnDef<DocumentCategory>[] = [
  categoryColumn,
  statusColumn,
  fileColumn,
]
