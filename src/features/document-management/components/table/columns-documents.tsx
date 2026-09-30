import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"

import { DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { FolderOpenIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type { Document } from "@/features/document-management/api/types/document"
import { StatusIndicator } from "@/features/document-management/components/table/status-indicator"

const institutionColumn: ColumnDef<Document> = {
  accessorKey: "establishmentName",
  id: "establishmentName",
  meta: { label: "Institución" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Institución" />,
  cell: ({ row }) => <span className="text-pretty">{row.original.establishmentName ?? ""}</span>,
  enableSorting: true,
}

const typeColumn: ColumnDef<Document> = {
  accessorKey: "typeName",
  id: "typeName",
  meta: { label: "Tipo de Documento" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Documento" />,
  cell: ({ row }) => <span className="text-pretty font-medium">{row.original.typeName}</span>,
  enableSorting: false,
}

const statusColumn: ColumnDef<Document> = {
  accessorKey: "status",
  id: "status",
  meta: { label: "Estado de Entrega" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Estado de Entrega" />,
  // V521: los 4 tipos van por categorías (antes solo PEI/PEC) -- sin
  // archivo propio, el badge va solo con el avance "x/n" al lado. El
  // popover de Consultar/Descargar vive en la tabla de anexos, un archivo
  // por categoría (no acá).
  cell: ({ row }) => {
    const document = row.original
    return (
      <div className="flex items-center gap-2">
        <StatusIndicator status={document.status} />
        {document.status !== "NO_APLICA" && document.totalCategories != null ? (
          <span className="text-xs text-muted-foreground">
            {document.completedCategories ?? 0}/{document.totalCategories}
          </span>
        ) : null}
      </div>
    )
  },
  enableSorting: false,
}

/**
 * Columna "Acción" explícita, NO la columna `id: "actions"` del
 * `DataTable`: esa usa un overlay absoluto que arranca con
 * `opacity-0` y solo aparece al hacer hover sobre la fila (ver
 * `data-table.tsx`). Acá queremos que el botón esté SIEMPRE
 * visible — es la acción principal de la fila, no algo secundario
 * que se revela.
 *
 * V521: "entrar a ver los anexos" es SIEMPRE lectura (subir/eliminar vive
 * un nivel más adentro, en `table-document-categories.tsx`, que sí
 * respeta `canWriteDocuments`) — por eso esta columna ya no depende de
 * `isReadOnly`: un Rector de solo lectura entra igual, solo que ahí adentro
 * no ve los botones de carga.
 */
const actionColumn: ColumnDef<Document> = {
  id: "singleAction",
  accessorKey: "status",
  meta: { label: "Acción" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Acción" />,
  cell: ({ row }) => {
    const document = row.original
    return (
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          color="neutral"
          size="sm"
          render={<Link to={paths.app.gestionDocumentalDetalle.getHref(document.type)} />}
          nativeButton={false}
        >
          <FolderOpenIcon data-icon="inline-start" />
          Ver anexos
        </Button>
      </div>
    )
  },
  enableSorting: false,
  enableHiding: false,
  size: 160,
}

/** Vista de un solo EE (Rector/Secretario/Administrador sobre su propio
 *  establecimiento): sin columna de institución (es siempre la misma). */
export const ownColumns: ColumnDef<Document>[] = [typeColumn, statusColumn, actionColumn]

/**
 * Vista de PIGSE-ADMINISTRADOR/PIGSE-SECRETARIA_TERRITORIAL sobre TODAS las
 * instituciones (V368): agrega la columna "Institución" al frente, y quita
 * "Acción" — es una vista de fiscalización, de solo lectura, no de carga
 * (mismo criterio que ya aplica al Rector en la vista de un solo EE).
 */
export const allInstitutionsColumns: ColumnDef<Document>[] = [
  institutionColumn,
  typeColumn,
  statusColumn,
]
