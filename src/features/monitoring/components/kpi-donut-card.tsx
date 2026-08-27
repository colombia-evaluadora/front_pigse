import { Cell, Pie, PieChart } from "recharts"

import { Card, CardContent } from "@/components/ui/card"
import { ChartContainer, type ChartConfig } from "@/components/ui/data/chart"

interface KpiDonutCardProps {
  /** Etiqueta superior de la tarjeta (ej. "Avance PEI"). */
  label: string
  /** Porcentaje 0..100 — se muestra al centro del donut. */
  percent: number
  /** "X de Y completados" — la bajada del porcentaje. */
  completed: number
  total: number
  /** Variante de color del arco completado. */
  variant?: "primary" | "warning" | "destructive"
}

/**
 * Tarjeta KPI del tablero "Monitoreo y cumplimiento institucional":
 * un donut con el porcentaje de avance y la bajada "X de Y completados".
 *
 * Sigue el mismo patrón de tarjeta (`Card` con `size="sm"`) que las
 * `AuditSessionStatsCards` del registro de actividad, para que las
 * cuatro tarjetas de la grilla se vean consistentes entre features.
 *
 * El donut se renderiza con `recharts` directo (no `ChartContainer`
 * wrappeado) porque acá solo queremos dos sectores — completado y
 * resto — sin leyenda ni tooltip, y la API de `Pie`/`Cell` ya da el
 * control fino del grosor/radio sin overhead.
 */
const COLOR_BY_VARIANT: Record<NonNullable<KpiDonutCardProps["variant"]>, string> = {
  primary: "#1F9254", // verde institucional — "va bien"
  warning: "#E0A82E", // ámbar — "va regular"
  destructive: "#A30D11", // rojo — "en alerta"
}

/** Color del sector "resto" (lo que falta para llegar al 100%). */
const TRACK_COLOR = "#E5E7EB"

export function KpiDonutCard({
  label,
  percent,
  completed,
  total,
  variant = "primary",
}: KpiDonutCardProps) {
  const accent = COLOR_BY_VARIANT[variant]

  // El gráfico de torta parte de 100: el sector "completado" pesa
  // `percent` y el "resto" pesa `100 - percent`. Cuando percent es 100,
  // dejamos un solo sector de 100 para evitar que se renderice un arco
  // vacío y otro completo encimado.
  const data =
    percent >= 100
      ? [{ name: "completed", value: 100 }]
      : [
          { name: "completed", value: percent },
          { name: "rest", value: 100 - percent },
        ]

  const chartConfig = {
    completed: { label: "Completado", color: accent },
    rest: { label: "Restante", color: TRACK_COLOR },
  } satisfies ChartConfig

  return (
    <Card size="sm">
      <CardContent className="flex items-center gap-3">
        <div className="relative size-14 shrink-0">
          <ChartContainer
            config={chartConfig}
            initialDimension={{ width: 56, height: 56 }}
            className="aspect-square size-full"
          >
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                innerRadius={20}
                outerRadius={26}
                startAngle={90}
                endAngle={-270}
                stroke="none"
                isAnimationActive={false}
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.name === "completed" ? accent : TRACK_COLOR} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
            {percent}%
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="m-0! text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {label}
          </p>
          <p className="m-0! text-base leading-tight font-bold text-pretty tabular-nums">
            {new Intl.NumberFormat("es-CO").format(completed)}
            <span className="text-muted-foreground">
              {" "}
              / {new Intl.NumberFormat("es-CO").format(total)}
            </span>
          </p>
          <p className="m-0! text-xs text-muted-foreground">completados</p>
        </div>
      </CardContent>
    </Card>
  )
}
