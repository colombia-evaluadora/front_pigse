import { Link } from "@tanstack/react-router"

import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/overlay/hover-card"
import { EyeIcon, FilePdfIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type {
  ComplianceDocumentState,
  DocumentType,
} from "@/features/monitoring/api/types/compliance"

interface ComplianceStatusCellProps {
  state: ComplianceDocumentState
  /**
   * Tipo de documento al que se refiere esta celda. Necesario para
   * armar la URL del visor (`/app/visor/:type`).
   */
  type: DocumentType
  /**
   * Nombre del establecimiento al que pertenece el documento. Se usa
   * solo para el `aria-label` del trigger y del botón "Consultar".
   */
  establishmentName: string
}

/**
 * Celda de estado documental de un EE: replica la celda del Figma.
 *
 * - `NO_APLICA` → texto "N/A" sin dot. Es el caso de PEI/PEC en un EE cuya
 *   modalidad no lo requiere (PEI en etnoeducativos, PEC en IE).
 * - `PENDIENTE` → dot rojo solo, sin texto (el EE puede/debe cargarlo).
 * - `COMPLETO` → dot verde + `HoverCard` con el nombre del archivo y un
 *   botón "Consultar Documento" que navega al visor de PDF
 *   (`/app/visor/:type`) con el EE y el archivo como query params.
 */
export function ComplianceStatusCell({
  state,
  type,
  establishmentName,
}: ComplianceStatusCellProps) {
  if (state.status === "NO_APLICA") {
    return (
      <span
        aria-label={`${establishmentName} · ${type} no aplica`}
        className="text-xs text-muted-foreground"
      >
        N/A
      </span>
    )
  }

  if (state.status === "PENDIENTE") {
    return (
      <span
        aria-label={`${establishmentName} · ${type} pendiente`}
        className="inline-flex items-center gap-2"
      >
        <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-red" />
        <span className="sr-only">{type} pendiente</span>
      </span>
    )
  }

  const trigger = (
    <button
      type="button"
      className="inline-flex cursor-pointer items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
    >
      <span aria-hidden="true" className="inline-block size-2.5 rounded-full bg-green" />
      <span className="sr-only">{`${establishmentName} · ver documento`}</span>
    </button>
  )

  return (
    <HoverCard>
      <HoverCardTrigger
        delay={120}
        closeDelay={120}
        render={<span className="inline-flex">{trigger}</span>}
      />
      <HoverCardContent side="top" sideOffset={6} className="w-72 rounded-xl">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-red/10 text-red">
              <FilePdfIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="m-0! truncate text-sm font-semibold text-pretty">
                {state.fileName ?? `${establishmentName}.pdf`}
              </p>
              <p className="m-0! text-xs text-muted-foreground">Click para visualizar</p>
            </div>
          </div>
          <Link
            to={paths.app.visor.getHref(type)}
            search={{
              establishmentName,
              fileName: state.fileName ?? undefined,
              archivoId: state.archivoId ?? undefined,
              downloadUrl: state.downloadUrl ?? undefined,
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted/40"
          >
            <EyeIcon className="size-3.5" />
            Consultar Documento
          </Link>
        </div>
      </HoverCardContent>
    </HoverCard>
  )
}
