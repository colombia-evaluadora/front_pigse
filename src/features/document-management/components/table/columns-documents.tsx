import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"

import type { Document } from "@/features/document-management/api/types/document"

import { isDocumentActionable } from "@/features/document-management/api/ui-mappings"
import { StatusIndicator } from "@/features/document-management/components/table/status-indicator"
import { DocumentDetailPopover } from "@/features/document-management/components/dialogs/popover-document-detail"
import { UploadDocumentDialog } from "@/features/document-management/components/dialogs/dialog-upload-document"
import { DeleteDocumentDialog } from "@/features/document-management/components/dialogs/dialog-delete-document"

export const columns: ColumnDef<Document>[] = [
  {
    accessorKey: "typeName",
    id: "typeName",
    meta: { label: "Tipo de Documento" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Documento" />,
    cell: ({ row }) => <span className="text-pretty font-medium">{row.original.typeName}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "status",
    id: "status",
    meta: { label: "Estado de Entrega" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado de Entrega" />,
    cell: ({ row }) => {
      const document = row.original
      // El popover envuelve al indicador visual para que el click sobre el
      // badge abra la tarjeta con el archivo y los botones Consultar /
      // Descargar. La columna "Acción" sigue siendo la fuente de verdad
      // para subir/eliminar.
      return (
        <DocumentDetailPopover document={document}>
          <StatusIndicator status={document.status} />
        </DocumentDetailPopover>
      )
    },
    enableSorting: false,
  },
  {
    /**
     * Columna "Acción" explícita, NO la columna `id: "actions"` del
     * `DataTable`: esa usa un overlay absoluto que arranca con
     * `opacity-0` y solo aparece al hacer hover sobre la fila (ver
     * `data-table.tsx`). Acá queremos que el botón esté SIEMPRE
     * visible — es la acción principal de la fila, no algo secundario
     * que se revela.
     *
     * Además: solo se muestra UNO a la vez según el estado del documento.
     * - PENDIENTE → "Subir PEI/PMI" (carga inicial).
     * - COMPLETO  → "Eliminar" (la vigente baja al historial; para
     *               reemplazarla primero se elimina y se vuelve a subir).
     */
    id: "singleAction",
    accessorKey: "status",
    meta: { label: "Acción" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Acción" />,
    cell: ({ row }) => {
      const document = row.original

      // Un documento que el EE no debe entregar no ofrece acción: no se puede
      // "subir" algo que no aplica ni "eliminar" algo que nunca existió. La
      // celda queda vacía en vez de mostrar un botón que el backend rechazaría.
      if (!isDocumentActionable(document.status)) return null

      const isPending = document.status === "PENDIENTE"
      return (
        <div className="flex items-center justify-end">
          {isPending ? (
            <UploadDocumentDialog document={document} />
          ) : (
            <DeleteDocumentDialog document={document} />
          )}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
    size: 160,
  },
]
