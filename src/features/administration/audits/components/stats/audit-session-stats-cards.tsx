import { CalendarIcon, LightningIcon, UsersIcon, type Icon } from "@/components/ui/icons"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

import { useAuditsStatsQuery } from "@/features/administration/audits/api/query/use-audits-stats-query"
import type { AuditsQueryRequest } from "@/features/administration/audits/api/types/audit"

interface AuditSessionStatsCardsProps {
  selectedIds: string[]
  hasSelection: boolean
  filters: AuditsQueryRequest["filters"]
}

const numberFormatter = new Intl.NumberFormat("es-CO")

interface StatTile {
  icon: Icon
  value: number | undefined
  label: string
  iconClassName: string
}

export function AuditSessionStatsCards({
  selectedIds,
  hasSelection,
  filters,
}: AuditSessionStatsCardsProps) {
  // Igual que exportar: con selección se calcula sobre lo seleccionado, sin
  // selección se calcula sobre lo que coincide con los filtros activos.
  const { data } = useAuditsStatsQuery(hasSelection ? { ids: selectedIds } : { filters })

  const tiles: StatTile[] = [
    {
      icon: CalendarIcon,
      value: data?.sessionsToday,
      label: "Sesiones",
      iconClassName: "bg-blue/10 text-blue",
    },
    {
      icon: UsersIcon,
      value: data?.activeSessions,
      label: "Sesiones activas",
      iconClassName: "bg-green/10 text-green",
    },
    {
      icon: LightningIcon,
      value: data?.operationsToday,
      label: "Operaciones",
      iconClassName: "bg-yellow/10 text-yellow",
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
