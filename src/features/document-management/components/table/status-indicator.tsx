import { Badge } from "@/components/ui/badge"

import {
  documentStatusBadge,
  documentStatusLabel,
} from "@/features/document-management/api/ui-mappings"
import type { Document } from "@/features/document-management/api/types/document"

interface StatusIndicatorProps {
  status: Document["status"]
}

/**
 * Punto del estado de entrega + badge.
 *
 * - COMPLETO  → punto verde + badge verde.
 * - PENDIENTE → punto rojo  + badge rojo.
 * - NO_APLICA → SIN punto, badge gris.
 *
 * El punto se omite en `NO_APLICA` a propósito, y es la misma decisión que
 * toma la celda del tablero de monitoreo (`compliance-status-cell.tsx`, que
 * ahí lo resuelve con una "N/A" pelada): el punto es un semáforo de
 * cumplimiento, y un documento que el EE no debe entregar no está ni bien ni
 * mal — ponerle un punto de cualquier color lo mete en una escala a la que no
 * pertenece.
 */
export function StatusIndicator({ status }: StatusIndicatorProps) {
  const dotColor = status === "COMPLETO" ? "bg-green" : "bg-red"

  return (
    <span className="inline-flex items-center gap-2">
      {status !== "NO_APLICA" ? (
        <span aria-hidden="true" className={`inline-block size-2.5 rounded-full ${dotColor}`} />
      ) : null}
      <Badge {...documentStatusBadge(status)}>{documentStatusLabel(status)}</Badge>
    </span>
  )
}
