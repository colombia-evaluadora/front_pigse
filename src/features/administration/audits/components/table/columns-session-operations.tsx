import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import { OPERATION_TYPE_BADGE } from "@/features/administration/audits/api/ui-mappings"
import { useAuditOperationTypesQuery } from "@/features/administration/audits/api/query/use-audit-operation-types-query"
import type { OperationType } from "@/features/administration/audits/api/types/audit-table"
import type { SessionOperation } from "@/features/administration/audits/api/types/audit"
import { ViewOperationChangesDialog } from "@/features/administration/audits/components/dialogs/dialog-view-operation-changes"

// El label del tipo de operación lo entrega el backend (`{ key, label }`).
// Si la query todavía no llegó, caemos al `key` como fallback para no
// bloquear el render.
function OperationBadgeCell({ operation }: { operation: OperationType }) {
  const { data: operationOptions = [] } = useAuditOperationTypesQuery()
  const label = operationOptions.find((o) => o.key === operation)?.label ?? operation
  return <Badge {...OPERATION_TYPE_BADGE[operation]}>{label}</Badge>
}

export const columns: ColumnDef<SessionOperation>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        aria-label="Seleccionar página"
        className="translate-y-0.5"
        checked={table.getIsAllPageRowsSelected()}
        indeterminate={!table.getIsAllPageRowsSelected() && table.getIsSomePageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        aria-label={`Seleccionar ${row.original.entityName}`}
        className="translate-y-0.5"
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 32,
  },
  {
    // Reemplaza Autor/IP de la tabla por-tabla-detalle: dentro de una
    // sesión todas las operaciones son del mismo autor, así que el dato
    // que sí aporta info es en qué TABLA se hicieron.
    id: "tableSlug",
    accessorKey: "tableSlug",
    meta: { label: "Tabla" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tabla" />,
    cell: ({ row }) => (
      // A diferencia de INSERT/UPDATE/DELETE (valores cortos y fijos), el
      // nombre de tabla es un identificador de largo variable
      // (`tpropiedad_juridica`) que estiraba la píldora hasta verse
      // desproporcionada al lado de los badges cortos. Se acota el ancho y
      // se trunca; el nombre completo queda en el `title`.
      <Badge
        variant="soft"
        color="muted"
        className="max-w-36 truncate"
        title={row.original.tableSlug}
      >
        {row.original.tableSlug}
      </Badge>
    ),
  },
  {
    id: "operation",
    accessorKey: "operation",
    meta: { label: "Operación" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Operación" />,
    cell: ({ row }) => {
      const operation = row.getValue<OperationType>("operation")
      return <OperationBadgeCell operation={operation} />
    },
  },
  {
    id: "detail",
    accessorKey: "entityName",
    meta: { label: "Detalle" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Detalle" />,
    cell: ({ row }) => {
      const op = row.original
      return (
        <div className="flex flex-col">
          <span className="font-medium">{op.entityName}</span>
          <span className="text-xs text-muted-foreground">{op.entityId}</span>
        </div>
      )
    },
  },
  {
    id: "occurredAt",
    accessorKey: "occurredAt",
    meta: { label: "Fecha" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha" />,
    cell: ({ row }) => {
      const occurredAt = new Date(row.getValue<string>("occurredAt"))
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {occurredAt.toLocaleTimeString(undefined, { hour12: false })}
          </span>
          <span className="text-xs text-muted-foreground">
            {occurredAt.toLocaleDateString("en-CA")}
          </span>
        </div>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <ViewOperationChangesDialog
        tableSlug={row.original.tableSlug}
        operationId={row.original.id}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 48,
  },
]

export type SessionOperationsTable = Table<SessionOperation>
