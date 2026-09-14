import type { ColumnDef } from "@tanstack/react-table"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface EmployeeColumnsOptions {
  onEdit: (employeeId: number) => void
}

// Cuántas sedes se listan por nombre antes de resumir el resto en un "+N".
//
// Es 1 y no 2 porque el "+N" cuenta lo que NO se renderiza, no lo que no entra:
// con 2 los nombres de sede rara vez caben en el ancho de la columna y el
// segundo se lo comía el `truncate`, así que se veía una sede y un "+1" cuando
// en realidad quedaban dos escondidas.
const VISIBLE_CAMPUSES = 1

function formatCampusNames(campuses: string[]) {
  return campuses.join(", ")
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
export function renderStatusCell(statuses: EmployeeListItem["statuses"]) {
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

function ActionsCell({
  employee,
  onEdit,
}: {
  employee: EmployeeListItem
  onEdit: (id: number) => void
}) {
  const { puedeEditar } = useMenuPermission("FUNCIONARIOS")

  return (
    <div className="flex items-center justify-end gap-1">
      {puedeEditar ? (
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label="Editar funcionario"
          onClick={() => onEdit(employee.id)}
        >
          <PencilIcon />
        </Button>
      ) : null}
      <DeleteEmployeeDialog employee={employee} />
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
      accessorKey: "establishmentName",
      id: "establishmentName",
      meta: { label: "Establecimiento" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimiento" />,
      cell: ({ row }) => (
        <span className="text-sm text-foreground">{row.original.establishmentName}</span>
      ),
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
                <span className="block max-w-[16rem] truncate text-sm text-foreground uppercase" />
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
      accessorKey: "campuses",
      id: "campuses",
      meta: { label: "Sede educativa" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sede educativa" />,
      enableSorting: false,
      cell: ({ row }) => {
        const campuses = row.original.campuses

        if (campuses.length === 0) {
          return <span className="text-sm text-foreground">—</span>
        }

        const extra = campuses.length - VISIBLE_CAMPUSES

        return (
          <Tooltip>
            <TooltipTrigger
              render={
                // El "+N" va fuera del `truncate` y con `shrink-0`: si compartiera
                // el bloque que se recorta, se lo comerían los puntos suspensivos
                // justo cuando hace falta leerlo.
                <div className="flex max-w-[18rem] items-center gap-1 text-sm text-foreground">
                  <span className="truncate">
                    {formatCampusNames(campuses.slice(0, VISIBLE_CAMPUSES))}
                  </span>
                  {extra > 0 ? <span className="shrink-0 text-muted-foreground">+{extra}</span> : null}
                </div>
              }
            />
            <TooltipContent>{formatCampusNames(campuses)}</TooltipContent>
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
      cell: ({ row }) => <ActionsCell employee={row.original} onEdit={onEdit} />,
      enableSorting: false,
      enableHiding: false,
      size: 96,
    },
  ]
}
