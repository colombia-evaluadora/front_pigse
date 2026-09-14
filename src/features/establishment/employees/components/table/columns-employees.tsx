import type { ColumnDef } from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/overlay/tooltip"

import type { EmployeeListItem } from "@/features/establishment/employees/api/types/employee"
import { DeleteEmployeeDialog } from "@/features/establishment/employees/components/dialogs/dialog-delete"

interface EmployeeColumnsOptions {
  onEdit: (employeeId: number) => void
}

/**
 * Une los nombres de un catálogo con comas. Un funcionario puede tener más de
 * un rol en su establecimiento.
 */
function formatCatalogNames(items: EmployeeListItem["roles"]) {
  return items.map((item) => item.name).join(", ")
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
