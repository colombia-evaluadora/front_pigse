import type { ColumnDef } from "@tanstack/react-table"

import { DataTableColumnHeader } from "@/components/data-table"

import type { ComplianceRow } from "@/features/monitoring/api/types/compliance"

import { ComplianceStatusCell } from "@/features/monitoring/components/table/compliance-status-cell"
import { ProgressBar } from "@/features/monitoring/components/table/progress-bar"

export const columns: ColumnDef<ComplianceRow>[] = [
  {
    accessorKey: "establishmentName",
    id: "establishmentName",
    meta: { label: "Nombre del Establecimiento" },
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Nombre del Establecimiento" />
    ),
    cell: ({ row }) => (
      <span className="text-pretty font-medium">{row.original.establishmentName}</span>
    ),
    enableSorting: true,
  },
  {
    accessorKey: "pei",
    id: "pei",
    meta: { label: "Estado PEI" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado PEI" />,
    cell: ({ row }) => (
      <ComplianceStatusCell
        type="PEI"
        state={row.original.pei}
        establishmentName={row.original.establishmentName}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "pec",
    id: "pec",
    meta: { label: "Estado PEC" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado PEC" />,
    cell: ({ row }) => (
      <ComplianceStatusCell
        type="PEC"
        state={row.original.pec}
        establishmentName={row.original.establishmentName}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "pmi",
    id: "pmi",
    meta: { label: "Estado PMI" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Estado PMI" />,
    cell: ({ row }) => (
      <ComplianceStatusCell
        type="PMI"
        state={row.original.pmi}
        establishmentName={row.original.establishmentName}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "globalProgress",
    id: "globalProgress",
    meta: { label: "Progreso Global" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Progreso Global" />,
    cell: ({ row }) => <ProgressBar value={row.original.globalProgress} />,
    enableSorting: true,
    sortingFn: "basic",
  },
]
