import { Link } from "@tanstack/react-router"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { paths } from "@/config/paths"

import type {
  ComplianceDocumentState,
  CompliancePlazo,
  ComplianceRow,
  DocumentType,
} from "@/features/monitoring/api/types/compliance"
import { documentStatusBadge, resolveEstado } from "@/features/monitoring/api/ui-mappings"

const BAR_TONE = {
  success: "bg-green",
  warning: "bg-yellow",
  destructive: "bg-red",
  orange: "bg-orange",
  muted: "bg-muted-foreground/40",
  info: "bg-blue",
  neutral: "bg-muted-foreground",
} as const

interface DocumentStatusCellProps {
  row: ComplianceRow
  /** Par excluyente por ETNIAS: [PEI, PEC] o [PMI, PFI]. */
  types: readonly [DocumentType, DocumentType]
}

/**
 * Celda de un PAR de documentos (proyecto educativo PEI/PEC o plan PMI/PFI).
 * A cada EE le aplica uno solo del par según ETNIAS, así que el tablero
 * muestra 2 columnas en vez de 4 con la mitad en "N/A". Si por datos
 * incompletos (ETNIAS nula) aplican los dos, se apilan.
 *
 * Toda la celda es un enlace al detalle documental del EE para ese tipo:
 * desde ahí se ven los anexos y se consulta cada archivo. Antes abría el
 * visor directo con `archivoId`, que en PEI/PEC siempre llega `null` (van
 * por anexos) y terminaba en "todavía no tiene un archivo cargado".
 */
export function DocumentStatusCell({ row, types }: DocumentStatusCellProps) {
  const applicable = types.filter((type) => stateOf(row, type).status !== "NO_APLICA")

  if (applicable.length === 0) {
    return (
      <span className="text-xs text-muted-foreground" aria-label="No aplica">
        —
      </span>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      {applicable.map((type) => (
        <DocumentStatusLink
          key={type}
          type={type}
          state={stateOf(row, type)}
          plazo={row.plazo}
          establishmentId={row.id}
          establishmentName={row.establishmentName}
        />
      ))}
    </div>
  )
}

function stateOf(row: ComplianceRow, type: DocumentType): ComplianceDocumentState {
  switch (type) {
    case "PEI":
      return row.pei
    case "PEC":
      return row.pec
    case "PMI":
      return row.pmi
    case "PFI":
      return row.pfi
  }
}

function DocumentStatusLink({
  type,
  state,
  plazo,
  establishmentId,
  establishmentName,
}: {
  type: DocumentType
  state: ComplianceDocumentState
  plazo?: CompliancePlazo | null
  establishmentId: number
  establishmentName: string
}) {
  const badge = documentStatusBadge(state, plazo)
  const total = state.totalCategories ?? 0
  const done = state.completedCategories ?? 0
  const percent =
    resolveEstado(state) === "COMPLETO" ? 100 : total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <Link
      to={paths.app.monitoreoCumplimientoDetalle.getHref(establishmentId, type)}
      aria-label={`${type} de ${establishmentName}: ${badge.description}. Ver documentos`}
      title={badge.description}
      className="group/doc -mx-1.5 flex w-fit min-w-36 flex-col gap-1 rounded-md px-1.5 py-1 outline-none transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring/40"
    >
      <span className="flex items-center gap-2">
        <span className="w-8 text-xs font-semibold text-muted-foreground">{type}</span>
        <Badge variant="soft" color={badge.color}>
          {badge.label}
        </Badge>
      </span>
      {total > 0 ? (
        <span aria-hidden="true" className="ml-10 h-1 w-20 overflow-hidden rounded-full bg-muted">
          <span
            className={cn("block h-full rounded-full", BAR_TONE[badge.color])}
            style={{ width: `${percent}%` }}
          />
        </span>
      ) : null}
    </Link>
  )
}
