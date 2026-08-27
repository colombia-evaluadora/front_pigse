"use client"

import * as React from "react"
import { ClockIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type Period = "AM" | "PM"
type ClockMode = "hour" | "minute"

interface TimePickerPanelProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
}

/**
 * Panel de selección de hora (ingreso manual + reloj analógico). Es el
 * equivalente de `Calendar` para la hora: el panel suelto, sin trigger. Para
 * un campo de formulario con el aspecto de un input, usar `TimePicker`.
 */
export function TimePickerPanel({ value, onChange, className }: TimePickerPanelProps) {
  const [view, setView] = React.useState<"text" | "analog">("text")
  const [hour, setHour] = React.useState(() => extractHour(value))
  const [minute, setMinute] = React.useState(() => extractMinute(value))
  const [period, setPeriod] = React.useState<Period>(() => derivePeriod(value))

  const [hourText, setHourText] = React.useState(() => pad(hour))
  const [minuteText, setMinuteText] = React.useState(() => pad(minute))

  // Sin valor el panel igual muestra 12:00 AM, así que un blur a secas no se
  // puede leer como una elección: si no, abrir el picker y hacer clic en
  // cualquier otro lado ya dejaba la hora en 12:00am. Solo cuenta como
  // intención haber escrito en el campo (o tocar el reloj / el AM-PM).
  const hourEdited = React.useRef(false)
  const minuteEdited = React.useRef(false)

  React.useEffect(() => {
    const h = extractHour(value)
    const m = extractMinute(value)
    setHour(h)
    setMinute(m)
    setPeriod(derivePeriod(value))
    setHourText(pad(h))
    setMinuteText(pad(m))
    hourEdited.current = false
    minuteEdited.current = false
  }, [value])

  function commit(nextHour: number, nextMinute: number, nextPeriod: Period) {
    setHour(nextHour)
    setMinute(nextMinute)
    setPeriod(nextPeriod)
    setHourText(pad(nextHour))
    setMinuteText(pad(nextMinute))
    const h24 = to24h(nextHour, nextPeriod)
    onChange?.(`${pad(h24)}:${pad(nextMinute)}`)
  }

  function commitHourText() {
    if (!hourEdited.current) return
    hourEdited.current = false
    commit(clamp(parseIntOrZero(hourText), 1, 12), readMinuteText(), period)
  }

  function commitMinuteText() {
    if (!minuteEdited.current) return
    minuteEdited.current = false
    commit(readHourText(), clamp(parseIntOrZero(minuteText), 0, 59), period)
  }

  /**
   * Cambiar AM/PM se toma con lo que hay escrito, no con lo último
   * confirmado: al hacer clic en el toggle el input todavía no ha alcanzado a
   * commitear su blur, y con el estado viejo se perdía la hora recién tecleada.
   */
  function commitPeriod(nextPeriod: Period) {
    hourEdited.current = false
    minuteEdited.current = false
    commit(readHourText(), readMinuteText(), nextPeriod)
  }

  function readHourText() {
    return clamp(parseIntOrZero(hourText), 1, 12)
  }

  function readMinuteText() {
    return clamp(parseIntOrZero(minuteText), 0, 59)
  }

  return (
    <div data-slot="time-picker" className={cn("bg-background flex flex-col gap-4 p-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
          Ingresar hora
        </span>
        <Button
          type="button"
          variant="fill"
          size="icon-sm"
          onClick={() => setView((v) => (v === "text" ? "analog" : "text"))}
          aria-label={view === "text" ? "Cambiar a reloj analógico" : "Cambiar a ingreso manual"}
        >
          <ClockIcon weight="bold" />
        </Button>
      </div>

      <div className="flex justify-center">
        {view === "text" ? (
          <TextInputView
            hourText={hourText}
            minuteText={minuteText}
            period={period}
            onHourTextChange={(v) => {
              hourEdited.current = true
              setHourText(v)
            }}
            onMinuteTextChange={(v) => {
              minuteEdited.current = true
              setMinuteText(v)
            }}
            onHourCommit={commitHourText}
            onMinuteCommit={commitMinuteText}
            onPeriodChange={commitPeriod}
          />
        ) : (
          <AnalogClockView
            hour={hour}
            minute={minute}
            period={period}
            onSelectHour={(h) => commit(h, minute, period)}
            onSelectMinute={(m) => commit(hour, m, period)}
            onPeriodChange={(p) => commit(hour, minute, p)}
          />
        )}
      </div>
    </div>
  )
}

function PeriodToggle({
  period,
  onPeriodChange,
  orientation,
  className,
}: {
  period: Period
  onPeriodChange: (p: Period) => void
  orientation: "horizontal" | "vertical"
  className?: string
}) {
  return (
    <ToggleGroup
      value={[period]}
      onValueChange={(next) => {
        const last = next[next.length - 1]
        if (last === "AM" || last === "PM") onPeriodChange(last)
      }}
      multiple={false}
      orientation={orientation}
      spacing={0}
      variant="outline"
      className={className}
    >
      <ToggleGroupItem value="AM" size="sm" aria-label="AM">
        AM
      </ToggleGroupItem>
      <ToggleGroupItem value="PM" size="sm" aria-label="PM">
        PM
      </ToggleGroupItem>
    </ToggleGroup>
  )
}

function TextInputView({
  hourText,
  minuteText,
  period,
  onHourTextChange,
  onMinuteTextChange,
  onHourCommit,
  onMinuteCommit,
  onPeriodChange,
}: {
  hourText: string
  minuteText: string
  period: Period
  onHourTextChange: (v: string) => void
  onMinuteTextChange: (v: string) => void
  onHourCommit: () => void
  onMinuteCommit: () => void
  onPeriodChange: (p: Period) => void
}) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1">
        <Input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={hourText}
          onChange={(e) => onHourTextChange(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={onHourCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onHourCommit()
          }}
          className="h-12 w-16 text-center text-2xl"
          aria-label="Hora"
        />
        <span className="text-muted-foreground text-center text-xs">Hora</span>
      </div>
      <span className="text-2xl font-medium">:</span>
      <div className="flex flex-col gap-1">
        <Input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={minuteText}
          onChange={(e) => onMinuteTextChange(e.target.value.replace(/\D/g, "").slice(0, 2))}
          onBlur={onMinuteCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onMinuteCommit()
          }}
          className="h-12 w-16 text-center text-2xl"
          aria-label="Minuto"
        />
        <span className="text-muted-foreground text-center text-xs">Minuto</span>
      </div>
      <PeriodToggle
        period={period}
        onPeriodChange={onPeriodChange}
        orientation="vertical"
        className="ml-2"
      />
    </div>
  )
}

function AnalogClockView({
  hour,
  minute,
  period,
  onSelectHour,
  onSelectMinute,
  onPeriodChange,
}: {
  hour: number
  minute: number
  period: Period
  onSelectHour: (hour: number) => void
  onSelectMinute: (minute: number) => void
  onPeriodChange: (p: Period) => void
}) {
  const [mode, setMode] = React.useState<ClockMode>("hour")

  function handleClick(value: number) {
    if (mode === "hour") {
      onSelectHour(value)
      setMode("minute")
    } else {
      onSelectMinute(value)
    }
  }

  const hourAngle = hour * 30
  const minuteAngle = minute * 6

  const values =
    mode === "hour"
      ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
      : [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Readout HH:mm + AM/PM en la misma fila — el toggle de
          período va al lado de la hora (lo que está editando), no al
          lado del reloj (que es el selector, no el valor). Cada mitad
          del HH:mm es un Button ghost clickeable para saltar al modo
          correspondiente del clock-face. */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-4xl font-semibold">
          <Button
            type="button"
            variant={mode === "hour" ? "soft" : "ghost"}
            color={mode === "hour" ? "primary" : "neutral"}
            size="sm"
            onClick={() => setMode("hour")}
            className="h-auto px-2 py-1 text-4xl normal-case tracking-normal"
          >
            {pad(hour)}
          </Button>
          <span>:</span>
          <Button
            type="button"
            variant={mode === "minute" ? "soft" : "ghost"}
            color={mode === "minute" ? "primary" : "neutral"}
            size="sm"
            onClick={() => setMode("minute")}
            className="h-auto px-2 py-1 text-4xl normal-case tracking-normal"
          >
            {pad(minute)}
          </Button>
        </div>

        <PeriodToggle period={period} onPeriodChange={onPeriodChange} orientation="vertical" />
      </div>

      <div className="relative aspect-square w-56 shrink-0 rounded-full border bg-background">
        {values.map((value, i) => {
          const angle = (i * 30 - 90) * (Math.PI / 180)
          const leftPct = 50 + 42 * Math.cos(angle)
          const topPct = 50 + 42 * Math.sin(angle)
          const isSelected = mode === "hour" ? value === hour : value === minute
          return (
            <button
              /* Key por posición, no por `value`: 5 y 10 aparecen en las dos
                 listas (horas y minutos) en índices distintos, así que con
                 `key={value}` React reutilizaba ese nodo y el `transition-all`
                 de `buttonVariants` animaba el cambio de `left`/`top`. Por
                 índice, cada slot se queda quieto y solo cambia la etiqueta. */
              key={i}
              type="button"
              onClick={() => handleClick(value)}
              className={cn(
                buttonVariants({
                  variant: isSelected ? "soft" : "ghost",
                  color: isSelected ? "primary" : "neutral",
                  size: "icon-sm",
                }),
                "absolute rounded-full text-sm normal-case tracking-normal",
                !isSelected && "border-transparent",
              )}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              {value}
            </button>
          )
        })}

        {/* Manecilla: barra vertical anclada por abajo al centro
            del reloj, rotada según `mode`. Termina en 33% (no 42%,
            que es donde están centrados los chips) para que la
            punta quede justo antes del chip en vez de taparle el
            número. `pointer-events-none` para que nunca se coma el
            click de un chip debajo. */}
        <div
          className="pointer-events-none absolute left-1/2 bg-foreground"
          style={{
            top: "50%",
            width: "2px",
            height: "33%",
            marginLeft: "-1px",
            transform: `translateY(-100%) rotate(${mode === "hour" ? hourAngle : minuteAngle}deg)`,
            transformOrigin: "bottom center",
          }}
        />
        {/* Centro (dot) — pointer-events-none por la misma razón. */}
        <div className="pointer-events-none absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground" />
      </div>
    </div>
  )
}

// Helpers

/** `"14:05"` → `"02:05 PM"`. `undefined` cuando no hay valor. */
export function formatTimeLabel(value?: string): string | undefined {
  if (!value) return undefined
  return `${pad(extractHour(value))}:${pad(extractMinute(value))} ${derivePeriod(value)}`
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n))
}

function parseIntOrZero(s: string): number {
  const n = parseInt(s, 10)
  return Number.isNaN(n) ? 0 : n
}

function extractHour(value?: string): number {
  if (!value) return 12
  const [h] = value.split(":")
  const n = parseInt(h, 10)
  if (Number.isNaN(n)) return 12
  // Convertimos de 24h a 12h para el input
  if (n === 0) return 12
  if (n > 12) return n - 12
  return n
}

function extractMinute(value?: string): number {
  if (!value) return 0
  const [, m] = value.split(":")
  const n = parseInt(m, 10)
  return Number.isNaN(n) ? 0 : n
}

function derivePeriod(value?: string): Period {
  if (!value) return "AM"
  const [h] = value.split(":")
  const n = parseInt(h, 10)
  if (Number.isNaN(n)) return "AM"
  return n >= 12 ? "PM" : "AM"
}

function to24h(hour12: number, period: Period): number {
  if (period === "AM") {
    return hour12 === 12 ? 0 : hour12
  }
  return hour12 === 12 ? 12 : hour12 + 12
}
