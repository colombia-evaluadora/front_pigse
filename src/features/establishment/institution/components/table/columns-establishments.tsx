import { Link } from "@tanstack/react-router"
import type { ColumnDef } from "@tanstack/react-table"

import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { PencilIcon } from "@/components/ui/icons"
import { DataTableColumnHeader } from "@/components/data-table"
import { paths } from "@/config/paths"

import {
  establishmentStatusBadge,
  establishmentStatusDisplayLabel,
} from "@/features/establishment/institution/api/ui-mappings"
import type { Establishment } from "@/features/establishment/institution/api/types/establishment"
import { DeleteEstablishmentDialog } from "@/features/establishment/institution/components/dialogs/dialog-delete"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

function ActionsCell({ establishment }: { establishment: Establishment }) {
  const { puedeEditar } = useMenuPermission("ESTABLECIMIENTO")

  return (
    <div className="flex items-center justify-end gap-1">
      {puedeEditar ? (
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size="icon-sm"
          aria-label={`Editar ${establishment.name}`}
          render={<Link to={paths.app.establishments.edit.getHref(establishment.id)} />}
          nativeButton={false}
        >
          <PencilIcon />
        </Button>
      ) : null}
      <DeleteEstablishmentDialog establishment={establishment} />
    </div>
  )
}

export const columns: ColumnDef<Establishment>[] = [
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
    accessorKey: "dane",
    id: "dane",
    meta: { label: "DANE" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="DANE" />,
  },
  {
    accessorKey: "name",
    id: "name",
    meta: { label: "Establecimiento" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimiento" />,
    cell: ({ row }) => <p className="uppercase font-bold">{row.getValue("name")}</p>,
  },
  {
    accessorFn: (row) => `${row.department}/${row.municipality}`,
    id: "departmentMunicipality",
    meta: { label: "Departamento/Municipio" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Departamento/Municipio" />
    ),
    cell: ({ row }) => (
      <div className="max-w-lg truncate">
        {row.original.department}/{row.original.municipality}
      </div>
    ),
  },
  {
    accessorKey: "statusLabel",
    id: "status",
    meta: { label: "Estado" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado" />,
    // El nombre ya viene resuelto en la fila (`statusLabel`) — no hace
    // falta ninguna consulta a catálogo acá, a diferencia de antes.
    cell: ({ row }) => {
      const label = row.original.statusLabel
      return (
        <Badge {...establishmentStatusBadge(label)}>{establishmentStatusDisplayLabel(label)}</Badge>
      )
    },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    cell: ({ row }) => <ActionsCell establishment={row.original} />,
    enableSorting: false,
    enableHiding: false,
    size: 96,
  },
]
