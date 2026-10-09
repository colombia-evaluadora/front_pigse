import { Badge } from "@/components/ui/badge"

import type { ComplianceRow } from "@/features/monitoring/api/types/compliance"
import { formatShortDate, plazoBadge } from "@/features/monitoring/api/ui-mappings"

/**
 * Fecha límite efectiva del EE (la excepción si la tiene, si no la global,
 * V522) con su situación: Vencido (pasó sin completar), Con prórroga,
 * Vigente o Cerrado. Sin fecha configurada no hay plazo que mostrar.
 */
export function DeadlineCell({ row }: { row: ComplianceRow }) {
  if (!row.fechaLimite) {
    return <span className="text-xs text-muted-foreground">Sin fecha límite</span>
  }
  const badge = plazoBadge(row)
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="text-sm tabular-nums">{formatShortDate(row.fechaLimite)}</span>
      {badge ? (
        <Badge variant="soft" color={badge.color} title={badge.description}>
          {badge.label}
        </Badge>
      ) : null}
    </div>
  )
}
