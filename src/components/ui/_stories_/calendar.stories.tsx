import preview from "../../../../.storybook/preview"
import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"

const meta = preview.meta({
  title: "Design System/Forms/Calendar",
  component: Calendar,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => {
    const [date, setDate] = useState<Date | undefined>(new Date())
    return (
      <Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border" />
    )
  },
})

export const Range = meta.story({
  render: () => {
    const [range, setRange] = useState<{ from: Date; to?: Date } | undefined>()
    return (
      <Calendar mode="range" selected={range} onSelect={setRange} className="rounded-md border" />
    )
  },
})

/**
 * Rango que cruza varios años — útil para ver cómo el drill-down de
 * 3 niveles (día → mes → año) muestra el rango en cada nivel con el
 * mismo patrón visual: start sólido (`bg-primary`), end sólido, middle
 * en `bg-muted`.
 */
export const CrossYearRange = meta.story({
  render: () => {
    const [range, setRange] = useState<{ from: Date; to?: Date } | undefined>({
      from: new Date(2024, 3, 9), // 9 Abr 2024
      to: new Date(2026, 6, 17), // 17 Jul 2026
    })
    return (
      <div className="flex flex-col gap-4">
        <div className="text-muted-foreground text-sm">
          Rango inicial: <strong>9 Abr 2024</strong> – <strong>17 Jul 2026</strong>. Prueba hacer
          drill-down (click en "Julio" o "2026") para ver cómo se renderiza el rango en cada nivel.
        </div>
        <Calendar mode="range" selected={range} onSelect={setRange} className="rounded-md border" />
      </div>
    )
  },
})

/**
 * Rango dentro de un mismo año — para ver el caso simple sin
 * cross-year. En el month view aparece Ene–May con `bg-muted`
 * (middle) y May con `bg-primary` (end).
 */
export const SameYearRange = meta.story({
  render: () => {
    const [range, setRange] = useState<{ from: Date; to?: Date } | undefined>({
      from: new Date(2026, 0, 15), // 15 Ene 2026
      to: new Date(2026, 4, 22), // 22 May 2026
    })
    return (
      <Calendar mode="range" selected={range} onSelect={setRange} className="rounded-md border" />
    )
  },
})
