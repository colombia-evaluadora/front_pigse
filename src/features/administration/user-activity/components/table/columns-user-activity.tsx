import type { ColumnDef, Table } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { DataTableColumnHeader } from "@/components/data-table"

import { USER_ACTIVITY_STATUS_BADGE, USER_ACTIVITY_STATUS_LABELS } from "@/features/administration/user-activity/api/ui-mappings"
import type { UserActivityRow } from "@/features/administration/user-activity/api/types/user-activity"

function formatDateTime(value: string | null): string {
  if (!value) return "—"
  const date = new Date(value)
  return `${date.toLocaleDateString("es-CO")} ${date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`
}

export const columns: ColumnDef<UserActivityRow>[] = [
  {
    id: "nombre",
    accessorKey: "nombre",
    meta: { label: "Nombre" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.nombre}</span>
        <span className="text-muted-foreground text-xs">{row.original.identificacion}</span>
      </div>
    ),
  },
  {
    id: "correo",
    accessorKey: "correo",
    meta: { label: "Correo" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Correo" />,
  },
  {
    id: "roles",
    accessorKey: "roles",
    meta: { label: "Roles" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Roles" />,
    cell: ({ row }) => <span className="text-sm">{row.original.roles}</span>,
  },
  {
    id: "establecimiento",
    accessorKey: "establecimientoNombre",
    meta: { label: "Establecimiento" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimiento" />,
    // Nulo para usuarios territoriales sin EE asociado (secretaría
    // territorial, jefes de área): no es un dato faltante, es que no
    // corresponde.
    cell: ({ row }) => <span>{row.original.establecimientoNombre ?? "—"}</span>,
  },
  {
    id: "ultimoLogin",
    accessorKey: "ultimoLogin",
    meta: { label: "Último ingreso" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Último ingreso" />,
    cell: ({ row }) => <span>{formatDateTime(row.original.ultimoLogin)}</span>,
  },
  {
    id: "ultimaActividad",
    accessorKey: "ultimaActividad",
    meta: { label: "Última actividad" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Última actividad" />,
    cell: ({ row }) => <span>{formatDateTime(row.original.ultimaActividad)}</span>,
  },
  {
    id: "estado",
    accessorKey: "estado",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const estado = row.original.estado
      return <Badge {...USER_ACTIVITY_STATUS_BADGE[estado]}>{USER_ACTIVITY_STATUS_LABELS[estado]}</Badge>
    },
  },
]

export type UserActivityTable = Table<UserActivityRow>
