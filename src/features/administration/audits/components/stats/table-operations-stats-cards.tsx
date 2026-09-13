import { PencilIcon, PlusCircleIcon, TrashIcon, type Icon } from "@/components/ui/icons"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { useTableOperationsStatsQuery } from "@/features/administration/audits/api/query/use-table-operations-stats-query"
import type { TableOperationsQueryRequest } from "@/features/administration/audits/api/types/audit-table"

interface TableOperationsStatsCardsProps {
  tableSlug: string
  selectedIds: string[]
  hasSelection: boolean
  filters: TableOperationsQueryRequest["filters"]
}

const numberFormatter = new Intl.NumberFormat("es-CO")

interface StatTile {
  icon: Icon
  value: number | undefined
  label: string
  iconClassName: string
}

export function TableOperationsStatsCards({
  tableSlug,
  selectedIds,
  hasSelection,
  filters,
}: TableOperationsStatsCardsProps) {
  // Igual que exportar: con selección se calcula sobre lo seleccionado, sin
  // selección se calcula sobre lo que coincide con los filtros activos.
  const { data } = useTableOperationsStatsQuery(
    hasSelection ? { tableSlug, ids: selectedIds } : { tableSlug, filters },
  )

  const tiles: StatTile[] = [
    {
      icon: PlusCircleIcon,
      value: data?.inserts,
      label: "Insert",
      iconClassName: "bg-blue/10 text-blue",
    },
    {
      icon: PencilIcon,
      value: data?.updates,
      label: "Update",
      iconClassName: "bg-yellow/10 text-yellow",
    },
    {
      icon: TrashIcon,
      value: data?.deletes,
      label: "Delete",
      iconClassName: "bg-red/10 text-red",
    },
  ]

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
      {tiles.map((tile) => (
        <Card key={tile.label} size="sm">
          <CardContent className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full",
                tile.iconClassName,
              )}
            >
              <tile.icon weight="fill" className="size-5" />
            </span>
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold text-foreground">
                {tile.value != null ? numberFormatter.format(tile.value) : "—"}
              </h3>
              <p className="text-sm text-muted-foreground">{tile.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
