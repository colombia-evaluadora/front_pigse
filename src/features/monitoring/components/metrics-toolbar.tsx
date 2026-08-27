import { ArrowUpIcon, BuildingsIcon } from "@/components/ui/icons"
import { Card, CardContent } from "@/components/ui/card"

import { useComplianceMetricsQuery } from "@/features/monitoring/api/query/use-compliance"
import { KpiDonutCard } from "@/features/monitoring/components/kpi-donut-card"

/**
 * Bloque de KPIs del tablero "Monitoreo y cumplimiento institucional":
 * una tarjeta grande con el total de EE y tres tarjetas con el avance
 * por documento (PEI / PEC / PMI) renderizadas con donut.
 *
 * Replica la fila del Figma y el patrón de `AuditSessionStatsCards`:
 * cuatro `Card` de `size="sm"` en una grilla responsive, todas sobre el
 * mismo fondo de la `TableScreenBody` que las contiene. La variante de
 * color del donut sale del porcentaje: verde si está al día, ámbar si
 * va regular, rojo si está en alerta (≤ 30%).
 *
 * Mientras la consulta está en vuelo se pinta un esqueleto del mismo
 * layout —cuatro tarjetas placeholder— para que la página no salte de
 * tamaño al llegar los datos.
 */
export function ComplianceMetricsCards() {
  const { data: metrics, isPending } = useComplianceMetricsQuery()

  if (isPending || !metrics) {
    return (
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} size="sm">
            <CardContent className="h-24 animate-pulse rounded-md bg-muted/40" />
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <TotalEstablishmentsCard value={metrics.totalEstablishments} />
      <KpiDonutCard
        label="Avance PEI"
        percent={metrics.pei.percent}
        completed={metrics.pei.completed}
        total={metrics.pei.total}
        variant={variantFor(metrics.pei.percent)}
      />
      <KpiDonutCard
        label="Avance PEC"
        percent={metrics.pec.percent}
        completed={metrics.pec.completed}
        total={metrics.pec.total}
        variant={variantFor(metrics.pec.percent)}
      />
      <KpiDonutCard
        label="Avance PMI"
        percent={metrics.pmi.percent}
        completed={metrics.pmi.completed}
        total={metrics.pmi.total}
        variant={variantFor(metrics.pmi.percent)}
      />
    </div>
  )
}

/**
 * Tarjeta con el total de EE: el ícono del tipo de entidad a la izquierda
 * y el número grande + etiqueta a la derecha. No usa donut porque es un
 * conteo absoluto, no un porcentaje.
 */
function TotalEstablishmentsCard({ value }: { value: number }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue/10 text-blue">
          <BuildingsIcon weight="fill" className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-baseline gap-1.5">
            <h3 className="m-0! text-2xl leading-none font-bold tabular-nums">
              {new Intl.NumberFormat("es-CO").format(value)}
            </h3>
            <ArrowUpIcon aria-hidden="true" className="size-4 text-green" />
          </div>
          <p className="text-sm text-muted-foreground">Total establecimientos</p>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Mapea un porcentaje a la variante de color del arco del donut.
 * Verde institucional si va bien, ámbar si va regular, rojo si está en
 * alerta. Los umbrales (30 / 60) están alineados con los del Figma.
 */
function variantFor(percent: number): "primary" | "warning" | "destructive" {
  if (percent <= 30) return "destructive"
  if (percent < 60) return "warning"
  return "primary"
}
