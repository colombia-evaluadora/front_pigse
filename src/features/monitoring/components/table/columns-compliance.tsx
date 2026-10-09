import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"

import { DataTableColumnHeader } from "@/components/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { FolderOpenIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type { ComplianceRow } from "@/features/monitoring/api/types/compliance"
import {
  applicableTypes,
  formatDateTime,
  formatRelative,
} from "@/features/monitoring/api/ui-mappings"
import { DeadlineCell } from "@/features/monitoring/components/table/deadline-cell"
import { DocumentStatusCell } from "@/features/monitoring/components/table/document-status-cell"
import { ProgressBar } from "@/features/monitoring/components/table/progress-bar"

/**
 * Columnas del tablero. Los cuatro tipos se agrupan en dos pares excluyentes
 * por ETNIAS (proyecto educativo PEI/PEC y plan PMI/PFI): cada EE muestra el
 * que le aplica, con su avance por anexos. Los ids de las columnas ordenables
 * son los `p_sort_campo` que entiende `fn_cumplimiento_listar_paginado`.
 */
export const columns: ColumnDef<ComplianceRow>[] = [
  {
    accessorKey: "establishmentName",
    id: "establishmentName",
    meta: { label: "Establecimiento" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Establecimiento" />,
    cell: ({ row }) => {
      const { establishmentName, establishmentCode, municipio, etnoeducativo } = row.original
      const subtitle = [establishmentCode ? `DANE ${establishmentCode}` : null, municipio]
        .filter(Boolean)
        .join(" · ")
      return (
        <div className="flex min-w-48 flex-col gap-0.5">
          <span className="font-medium text-pretty">{establishmentName}</span>
          {subtitle ? <span className="text-xs text-muted-foreground">{subtitle}</span> : null}
          {etnoeducativo ? (
            <Badge variant="outline" color="secondary" className="mt-0.5">
              Etnoeducativo
            </Badge>
          ) : null}
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: "proyectoEducativo",
    meta: { label: "Proyecto educativo (PEI / PEC)" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="PEI / PEC" />,
    cell: ({ row }) => <DocumentStatusCell row={row.original} types={["PEI", "PEC"]} />,
    enableSorting: false,
  },
  {
    id: "planInstitucional",
    meta: { label: "Plan institucional (PMI / PFI)" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="PMI / PFI" />,
    cell: ({ row }) => <DocumentStatusCell row={row.original} types={["PMI", "PFI"]} />,
    enableSorting: false,
  },
  {
    accessorKey: "fechaLimite",
    id: "fechaLimite",
    meta: { label: "Fecha límite" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Fecha límite" />,
    cell: ({ row }) => <DeadlineCell row={row.original} />,
    enableSorting: true,
  },
  {
    accessorKey: "lastUploadedAt",
    id: "lastUploadedAt",
    meta: { label: "Última carga" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Última carga" />,
    cell: ({ row }) =>
      row.original.lastUploadedAt ? (
        <time
          dateTime={row.original.lastUploadedAt}
          title={formatDateTime(row.original.lastUploadedAt)}
          className="text-sm whitespace-nowrap text-muted-foreground"
        >
          {formatRelative(row.original.lastUploadedAt)}
        </time>
      ) : (
        <span className="text-xs text-muted-foreground">Sin cargas</span>
      ),
    enableSorting: true,
  },
  {
    accessorKey: "globalProgress",
    id: "globalProgress",
    meta: { label: "Progreso global" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Progreso global" />,
    cell: ({ row }) => <ProgressBar value={row.original.globalProgress} />,
    enableSorting: true,
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Acciones</span>,
    enableSorting: false,
    enableHiding: false,
    size: 48,
    cell: ({ row }) => {
      const [first] = applicableTypes(row.original.etnoeducativo)
      return (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Ver documentos de ${row.original.establishmentName}`}
            title="Ver documentos"
            render={<Link to={paths.app.monitoreoCumplimientoDetalle.getHref(row.original.id, first)} />}
            nativeButton={false}
          >
            <FolderOpenIcon />
          </Button>
        </div>
      )
    },
  },
]
