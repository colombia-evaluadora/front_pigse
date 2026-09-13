import type { ColumnDef, Table } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"
import { CheckIcon, ListMagnifyingGlassIcon } from "@/components/ui/icons"

import { Avatar, AvatarBadge, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/data-table"
import { paths } from "@/config/paths"

import { SESSION_STATUS_BADGE } from "@/features/administration/audits/api/ui-mappings"
import { useAuditSessionStatusesQuery } from "@/features/administration/audits/api/query/use-audit-session-statuses-query"
import type { AuditSession, SessionStatus } from "@/features/administration/audits/api/types/audit"

function initials(name: string): string {
  const [first, second] = name.trim().split(/\s+/)
  return `${first?.[0] ?? ""}${second?.[0] ?? ""}`.toUpperCase()
}

function formatDuration(session: AuditSession): string {
  if (session.status === "active") return "En curso"
  if (!session.endedAt) return "—"

  const ms = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()
  const totalMinutes = Math.max(0, Math.round(ms / 60000))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  return `${hours}h ${minutes}m`
}

// El label del estado lo entrega el backend (`{ key, label }`). Si la query
// todavía no llegó, caemos al `key` como fallback para no bloquear el render.
function StatusBadgeCell({ status }: { status: SessionStatus }) {
  const { data: statusOptions = [] } = useAuditSessionStatusesQuery()
  const label = statusOptions.find((o) => o.key === status)?.label ?? status
  return <Badge {...SESSION_STATUS_BADGE[status]}>{label}</Badge>
}

export const columns: ColumnDef<AuditSession>[] = [
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
        aria-label={`Seleccionar ${row.original.authorName}`}
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
    id: "authorIp",
    accessorKey: "authorName",
    meta: { label: "Autor / IP" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Autor / IP" />,
    cell: ({ row }) => {
      const session = row.original
      return (
        <div className="flex items-center gap-3">
          <Avatar>
            {session.authorAvatarUrl && <AvatarImage src={session.authorAvatarUrl} alt="" />}
            <AvatarFallback>{initials(session.authorName)}</AvatarFallback>
            {session.authorVerified && (
              <AvatarBadge>
                <CheckIcon weight="bold" />
              </AvatarBadge>
            )}
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <span className="truncate font-semibold">{session.authorName}</span>
            <Badge variant="soft" color="muted">
              {session.ip}
            </Badge>
          </div>
        </div>
      )
    },
  },
  {
    id: "startedAt",
    accessorKey: "startedAt",
    meta: { label: "Inicio" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Inicio" />,
    cell: ({ row }) => {
      const startedAt = new Date(row.getValue<string>("startedAt"))
      return (
        <div className="flex flex-col">
          <span className="font-medium">
            {startedAt.toLocaleTimeString(undefined, { hour12: false })}
          </span>
          <span className="text-xs text-muted-foreground">
            {startedAt.toLocaleDateString("en-CA")}
          </span>
        </div>
      )
    },
  },
  {
    id: "duration",
    meta: { label: "Duración" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Duración" />,
    cell: ({ row }) => <span>{formatDuration(row.original)}</span>,
  },
  {
    id: "status",
    accessorKey: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    cell: ({ row }) => {
      const status = row.getValue<SessionStatus>("status")
      return <StatusBadgeCell status={status} />
    },
  },
  {
    id: "operations",
    accessorKey: "operationsCount",
    meta: { label: "Operaciones" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Operaciones" />,
    cell: ({ row }) => <span className="font-medium">{row.original.operationsCount}</span>,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => (
      <Button
        variant="ghost"
        color="neutral"
        size="icon-sm"
        aria-label={`Ver operaciones de la sesión de ${row.original.authorName}`}
        render={<Link to={paths.app.auditoriaSesionOperaciones.getHref(row.original.id)} />}
        nativeButton={false}
      >
        <ListMagnifyingGlassIcon weight="bold" />
      </Button>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 48,
  },
]

export type AuditSessionTable = Table<AuditSession>
