import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/overlay/tooltip"

import {
  EMPLOYEE_STATUS_BADGE,
  EMPLOYEE_STATUS_LABELS,
} from "@/features/establishment/employees/api/ui-mappings"
import type { EmployeeListItem } from "@/features/establishment/employees/api/types/employee"
import { DeleteEmployeeDialog } from "@/features/establishment/employees/components/dialogs/dialog-delete"

interface EmployeeColumnsOptions {
  onEdit: (employeeId: number) => void
}

/**
 * Une los nombres de un catálogo con comas. Lo usan "Rol" y "Jornada": ambas
 * son texto plano y no badges — el funcionario puede tener varios de cada uno
 * y una hilera de píldoras compite con el badge de estado, que sí necesita el
 * color para distinguir activo de suspendido.
 */
function formatCatalogNames(items: EmployeeListItem["roles"]) {
  return items.map((item) => item.name).join(", ")
}

/**
 * Un badge por estado, no uno solo con los estados concatenados: cuando el
 * funcionario mezcla permisos `ACTIVE` y `SUSPENDED`, un único badge tendría
 * que elegir un color para dos estados opuestos ("Activo, Suspendido" en
 * rojo). Separados, cada uno lleva su color —verde activo, rojo suspendido—
 * y la mezcla se lee sola.
 */
function renderStatusCell(statuses: EmployeeListItem["statuses"]) {
  if (statuses.length === 0) {
    return "—"
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {statuses.map((status) => (
        <Badge key={status} {...EMPLOYEE_STATUS_BADGE[status]}>
          {EMPLOYEE_STATUS_LABELS[status]}
        </Badge>
      ))}
    </div>
  )
}

export function createColumns({ onEdit }: EmployeeColumnsOptions): ColumnDef<EmployeeListItem>[] {
  return [
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
          aria-label={`Seleccionar ${row.original.name}`}
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
      accessorKey: "documentNumber",
      id: "documentNumber",
      meta: { label: "N° Documento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="N° Documento" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.documentNumber}</span>,
    },
    {
      accessorKey: "name",
      id: "name",
      meta: { label: "Nombre" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Nombre" />,
      cell: ({ row }) => <p className="uppercase font-bold">{row.original.name}</p>,
    },
    {
      accessorKey: "role",
      id: "role",
      meta: { label: "Rol" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Rol" />,
      cell: ({ row }) => {
        if (row.original.roles.length === 0) {
          return <span className="text-sm text-foreground">—</span>
        }

        const fullText = formatCatalogNames(row.original.roles)

        return (
          <Tooltip>
            <TooltipTrigger
              render={
                // El ancho es lo que dispara los puntos suspensivos: con el tope
                // anterior (16rem) casi ningún rol llegaba a recortarse y el
                // tooltip aparecía sin que nada avisara que había más texto.
                <span className="block max-w-[12rem] truncate text-sm text-foreground uppercase" />
              }
            >
              {fullText}
            </TooltipTrigger>
            <TooltipContent>{fullText}</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      accessorKey: "workSchedules",
      id: "workSchedule",
      meta: { label: "Jornada" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Jornada" />,
      cell: ({ row }) => {
        const workSchedules = row.original.workSchedules

        if (workSchedules.length === 0) {
          return <span className="text-sm text-foreground">—</span>
        }

        // Un funcionario puede tener permisos en varias jornadas: se listan
        // separadas por comas y en mayúsculas, igual que la columna "Rol".
        const fullText = formatCatalogNames(workSchedules)

        return (
          <Tooltip>
            <TooltipTrigger
              render={
                // Mismo tope que "Rol": con varias jornadas el texto se recorta
                // con "…" y el tooltip trae la lista completa.
                <span className="block max-w-[12rem] truncate text-sm text-foreground uppercase" />
              }
            >
              {fullText}
            </TooltipTrigger>
            <TooltipContent>{fullText}</TooltipContent>
          </Tooltip>
        )
      },
    },
    {
      accessorKey: "status",
      id: "status",
      meta: { label: "Estado" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{renderStatusCell(row.original.statuses)}</span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label="Editar funcionario"
            onClick={() => onEdit(row.original.id)}
          >
            <PencilIcon />
          </Button>
          <DeleteEmployeeDialog employee={row.original} />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}
