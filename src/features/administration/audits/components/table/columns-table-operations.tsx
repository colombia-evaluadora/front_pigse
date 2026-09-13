import type { ColumnDef, Table } from "@tanstack/react-table"
import { CheckIcon } from "@/components/ui/icons"

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"

import { OPERATION_TYPE_BADGE } from "@/features/administration/audits/api/ui-mappings"
import { useAuditOperationTypesQuery } from "@/features/administration/audits/api/query/use-audit-operation-types-query"
import type { OperationType, TableOperation } from "@/features/administration/audits/api/types/audit-table"
import { ViewOperationChangesDialog } from "@/features/administration/audits/components/dialogs/dialog-view-operation-changes"

// El label del tipo de operación lo entrega el backend (`{ key, label }`).
// Si la query todavía no llegó, caemos al `key` como fallback para no
// bloquear el render.
function OperationBadgeCell({ operation }: { operation: OperationType }) {
  const { data: operationOptions = [] } = useAuditOperationTypesQuery()
  const label = operationOptions.find((o) => o.key === operation)?.label ?? operation
  return <Badge {...OPERATION_TYPE_BADGE[operation]}>{label}</Badge>
}

function initials(name: string): string {
  const [first, second] = name.trim().split(/\s+/)
  return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase()
}

export const columns: ColumnDef<TableOperation>[] = [
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
    id: "authorIp",
    accessorKey: "authorName",
    meta: { label: "Autor / IP" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Autor / IP" />,
    cell: ({ row }) => {
      const op = row.original
      return (
        <div className="flex items-center gap-3">
          <Avatar>
            {op.authorAvatarUrl && <AvatarImage src={op.authorAvatarUrl} alt="" />}
            <AvatarFallback>{initials(op.authorName)}</AvatarFallback>
            {op.authorVerified && (
              <AvatarBadge>
                <CheckIcon weight="bold" />
              </AvatarBadge>
            )}
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-semibold">{op.authorName}</span>
            <Badge variant="soft" color="muted">
              {op.ip}
            </Badge>
          </div>
        </div>
      )
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
    cell: ({ row }) => <ViewOperationChangesDialog operationId={row.original.id} />,
    enableSorting: false,
    enableHiding: false,
    size: 48,
  },
]

export type TableOperationsTable = Table<TableOperation>
