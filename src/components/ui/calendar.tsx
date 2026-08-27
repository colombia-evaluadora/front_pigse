import * as React from "react"
import { DayPicker, getDefaultClassNames, type DayButton, type Locale } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { CaretLeftIcon, CaretRightIcon } from "@/components/ui/icons"

type CalendarView = "days" | "months" | "years"

// Calendar hereda los props de DayPicker. Usamos `any` en la base porque
// las overloads de DayPicker son muy estrictas con el modo y los callers
// siempre pasan props válidos en runtime.
type CalendarProps = any & {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}

/**
 * Calendario con drill-down de 3 niveles (día / mes / año). A diferencia
 * del `captionLayout: "dropdown"` de react-day-picker (que renderiza
 * `<select>` nativos), acá el click en "julio" o "2026" cambia la vista
 * entera: del grid de días pasamos a la grilla de 12 meses, y de ahí a la
 * grilla de años — patrón típico de date pickers tipo Material.
 *
 * Implementación: ocultamos la caption nativa de DayPicker vía CSS y
 * renderizamos nuestra propia barra de navegación arriba del calendario.
 * Así evitamos problemas con overrides de componentes (que parecen no
 * aplicarse en algunas versiones del wrapper).
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  buttonVariant = "ghost",
  locale,
  formatters,
  components,
  month,
  mode,
  selected,
  onSelect,
  ...props
}: CalendarProps) {
  const [view, setView] = React.useState<CalendarView>("days")
  const [displayMonth, setDisplayMonth] = React.useState<Date>(() => month ?? new Date())

  React.useEffect(() => {
    if (month) setDisplayMonth(month)
  }, [month])

  const handleMonthChange = React.useCallback((date: Date) => {
    setDisplayMonth(date)
  }, [])

  const handlePrevMonth = React.useCallback(() => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() - 1, 1))
  }, [displayMonth])

  const handleNextMonth = React.useCallback(() => {
    setDisplayMonth(new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 1))
  }, [displayMonth])

  const handlePrevYear = React.useCallback(() => {
    setDisplayMonth(new Date(displayMonth.getFullYear() - 1, displayMonth.getMonth(), 1))
  }, [displayMonth])

  const handleNextYear = React.useCallback(() => {
    setDisplayMonth(new Date(displayMonth.getFullYear() + 1, displayMonth.getMonth(), 1))
  }, [displayMonth])

  const handlePrevDecade = React.useCallback(() => {
    setDisplayMonth(new Date(displayMonth.getFullYear() - 10, displayMonth.getMonth(), 1))
  }, [displayMonth])

  const handleNextDecade = React.useCallback(() => {
    setDisplayMonth(new Date(displayMonth.getFullYear() + 10, displayMonth.getMonth(), 1))
  }, [displayMonth])

  const handleSelectMonth = React.useCallback(
    (monthIndex: number) => {
      setDisplayMonth(new Date(displayMonth.getFullYear(), monthIndex, 1))
      setView("days")
    },
    [displayMonth],
  )

  const handleSelectYear = React.useCallback(
    (year: number) => {
      setDisplayMonth(new Date(year, displayMonth.getMonth(), 1))
      setView("months")
    },
    [displayMonth],
  )

  // Bounds del rango seleccionado — los pasamos a MonthGrid/YearGrid
  // para que visualicen el rango de la misma forma que el day view:
  // start sólido (`bg-primary`), resto del rango en `bg-muted`. Si no
  // hay rango, los bounds quedan null y no se marca nada.
  // `selected` cambia de forma según el modo: `Date` en single, `Date[]`
  // en multiple, `{from,to}` en range. Normalizamos a un par from/to para
  // que las vistas de mes/año marquen el seleccionado en los tres casos
  // (en single, from === to → se pinta sólido, sin middle).
  const { from: selectedFrom, to: selectedTo } = normalizeSelected(selected)
  const bounds = {
    fromYearMonth: selectedFrom ? `${selectedFrom.getFullYear()}-${selectedFrom.getMonth()}` : null,
    toYearMonth: selectedTo ? `${selectedTo.getFullYear()}-${selectedTo.getMonth()}` : null,
  }

  const monthName = displayMonth.toLocaleString("es", { month: "long" })
  const year = displayMonth.getFullYear()

  return (
    <div
      data-slot="calendar"
      className={cn(
        // El ancho es del propio componente, no algo que cada caller
        // tenga que fijar desde afuera (ej. `PopoverContent className`)
        // — sino, cambia de tamaño entre la vista de días y la de
        // meses/años según lo que el padre haya puesto. `w-64` es el
        // ancho natural de 7 columnas de `--cell-size` (2rem) más el
        // padding del propio calendario.
        "group/calendar bg-background w-64 p-3 [--cell-radius:0] [--cell-size:--spacing(8)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
    >
      {view === "days" && (
        <>
          {/* Nav header custom — reemplaza la caption nativa de
              DayPicker (que ocultamos vía CSS más abajo) para tener
              botones propios con drill-down. */}
          <div className="mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="hover:text-primary inline-flex size-(--cell-size) items-center justify-center"
              aria-label="Mes anterior"
            >
              <CaretLeftIcon className="size-4" />
            </button>
            <div className="flex flex-1 items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setView("months")}
                className="hover:text-primary text-sm font-medium capitalize"
              >
                {monthName}
              </button>
              <button
                type="button"
                onClick={() => setView("years")}
                className="hover:text-primary text-sm font-medium"
              >
                {year}
              </button>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="hover:text-primary inline-flex size-(--cell-size) items-center justify-center"
              aria-label="Mes siguiente"
            >
              <CaretRightIcon className="size-4" />
            </button>
          </div>

          {/* La caption nativa de DayPicker queda oculta via `!hidden` en
              classNames.month_caption — ya tenemos la nuestra arriba. */}
          <div>
            <DayPicker
              mode={mode}
              month={displayMonth}
              onMonthChange={handleMonthChange}
              selected={selected}
              onSelect={onSelect}
              showOutsideDays={showOutsideDays}
              hideNavigation // oculta el nav nativo — usamos el nuestro
              locale={locale}
              formatters={formatters}
              classNames={getDayPickerClassNames({ buttonVariant, classNames })}
              components={{
                Chevron: ChevronIcon,
                DayButton: (dayProps: React.ComponentProps<typeof DayButton>) => (
                  <CalendarDayButton locale={locale} {...dayProps} />
                ),
                ...components,
              }}
              {...props}
            />
          </div>
        </>
      )}

      {view === "months" && (
        <MonthGrid
          displayMonth={displayMonth}
          bounds={bounds}
          onPrevYear={handlePrevYear}
          onNextYear={handleNextYear}
          onYearClick={() => setView("years")}
          onSelect={handleSelectMonth}
        />
      )}

      {view === "years" && (
        <YearGrid
          displayMonth={displayMonth}
          bounds={bounds}
          onPrevDecade={handlePrevDecade}
          onNextDecade={handleNextDecade}
          onSelect={handleSelectYear}
        />
      )}
    </div>
  )
}

function normalizeSelected(selected: unknown): {
  from?: Date
  to?: Date
} {
  if (!selected) return {}
  if (selected instanceof Date) return { from: selected, to: selected }
  if (Array.isArray(selected)) {
    const dates = (selected as Date[]).filter((d) => d instanceof Date)
    if (dates.length === 0) return {}
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime())
    return { from: sorted[0], to: sorted[sorted.length - 1] }
  }
  const range = selected as { from?: Date; to?: Date }
  return { from: range.from, to: range.to }
}

const MONTH_LABELS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
]

interface RangeBounds {
  // Año-mes del inicio y fin del rango (inclusive). El usuario lo
  // arma clickeando en el day view — el MonthGrid/YearGrid recibe
  // esos bounds y aplica el mismo estilo visual que react-day-picker
  // usa en la grilla de días: start sólido (`bg-primary`), resto del
  // rango en `bg-muted`.
  fromYearMonth: string | null
  toYearMonth: string | null
}

function MonthGrid({
  displayMonth,
  bounds,
  onPrevYear,
  onNextYear,
  onYearClick,
  onSelect,
}: {
  displayMonth: Date
  bounds: RangeBounds
  onPrevYear: () => void
  onNextYear: () => void
  onYearClick: () => void
  onSelect: (monthIndex: number) => void
}) {
  const year = displayMonth.getFullYear()

  return (
    <div className="flex flex-col gap-4">
      {/* Header con mismo layout que el day view: flechas en los
          extremos + label centrado con flex-1 para tener espacio real
          entre flecha y label (no `gap-2` chiquito). */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevYear}
          className="hover:text-primary inline-flex size-(--cell-size) items-center justify-center"
          aria-label="Año anterior"
        >
          <CaretLeftIcon className="size-4" />
        </button>
        <button
          type="button"
          onClick={onYearClick}
          className="hover:text-primary px-1 text-sm font-medium"
          aria-label="Seleccionar año"
        >
          {year}
        </button>
        <button
          type="button"
          onClick={onNextYear}
          className="hover:text-primary inline-flex size-(--cell-size) items-center justify-center"
          aria-label="Año siguiente"
        >
          <CaretRightIcon className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {MONTH_LABELS_ES.map((label, index) => {
          // Comparamos por año-mes real (no strings) para que un rango
          // cross-year se "corte" en los bordes del año que estamos
          // viendo. Sin esto, en 2026 se marcaba Ene-Jun como "in
          // range" porque "2026-0" > "2024-3" lexicográficamente — no
          // tiene sentido visualmente.
          const fromYear = bounds.fromYearMonth ? Number(bounds.fromYearMonth.split("-")[0]) : null
          const fromMonth = bounds.fromYearMonth ? Number(bounds.fromYearMonth.split("-")[1]) : null
          const toYear = bounds.toYearMonth ? Number(bounds.toYearMonth.split("-")[0]) : null
          const toMonth = bounds.toYearMonth ? Number(bounds.toYearMonth.split("-")[1]) : null
          const isRangeStart = fromYear === year && fromMonth === index
          const isRangeEnd = toYear === year && toMonth === index
          const isInRange =
            fromYear !== null &&
            toYear !== null &&
            ((year > fromYear && year < toYear) ||
              (year === fromYear && index >= (fromMonth ?? 0)) ||
              (year === toYear && index <= (toMonth ?? 11)))
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "hover:bg-muted w-full rounded-(--cell-radius) py-3 text-sm font-medium",
                (isRangeStart || isRangeEnd) &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                isInRange && !isRangeStart && !isRangeEnd && "bg-muted text-foreground",
              )}
            >
              {label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function YearGrid({
  displayMonth,
  bounds,
  onPrevDecade,
  onNextDecade,
  onSelect,
}: {
  displayMonth: Date
  bounds: RangeBounds
  onPrevDecade: () => void
  onNextDecade: () => void
  onSelect: (year: number) => void
}) {
  const baseYear = displayMonth.getFullYear()
  const startYear = baseYear - 5
  const years = Array.from({ length: 12 }, (_, i) => startYear + i)
  const decadeLabel = `${years[0]} – ${years[years.length - 1]}`

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPrevDecade}
          className="hover:text-primary inline-flex size-(--cell-size) items-center justify-center"
          aria-label="Década anterior"
        >
          <CaretLeftIcon className="size-4" />
        </button>
        {/* El rango de años es solo decorativo en este nivel (la
            selección es por año individual); no hace drill-up
            adicional porque ya estamos en la vista más alta. */}
        <span className="px-1 text-sm font-medium">{decadeLabel}</span>
        <button
          type="button"
          onClick={onNextDecade}
          className="hover:text-primary inline-flex size-(--cell-size) items-center justify-center"
          aria-label="Década siguiente"
        >
          <CaretRightIcon className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {years.map((year) => {
          // Para YearGrid, el rango es por AÑO (no por año-mes).
          // Extraemos solo el año de los strings "YYYY-M".
          const fromYear = bounds.fromYearMonth ? Number(bounds.fromYearMonth.split("-")[0]) : null
          const toYear = bounds.toYearMonth ? Number(bounds.toYearMonth.split("-")[0]) : null
          // Tanto el inicio como el fin van con `bg-primary`; el
          // middle va con `bg-muted` (igual que el day view).
          const isRangeStart = year === fromYear
          const isRangeEnd = year === toYear
          const isInRange =
            fromYear !== null && toYear !== null && year >= fromYear && year <= toYear
          return (
            <button
              key={year}
              type="button"
              onClick={() => onSelect(year)}
              className={cn(
                "hover:bg-muted w-full rounded-(--cell-radius) py-3 text-sm font-medium",
                (isRangeStart || isRangeEnd) &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                isInRange && !isRangeStart && !isRangeEnd && "bg-muted text-foreground",
              )}
            >
              {year}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ChevronIcon({
  className,
  orientation,
  ...props
}: React.ComponentPropsWithoutRef<"svg"> & { orientation?: string }) {
  if (orientation === "left") {
    return <CaretLeftIcon className={cn("size-4", className)} {...props} />
  }
  return <CaretRightIcon className={cn("size-4", className)} {...props} />
}

function getDayPickerClassNames({
  buttonVariant,
  classNames,
}: {
  buttonVariant?: React.ComponentProps<typeof Button>["variant"]
  classNames?: Record<string, string>
}) {
  const defaultClassNames = getDefaultClassNames()
  return {
    root: cn("w-fit", defaultClassNames.root),
    months: cn("relative flex flex-col gap-4 md:flex-row", defaultClassNames.months),
    month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
    button_previous: cn(
      buttonVariants({ variant: buttonVariant }),
      "size-(--cell-size) p-0 select-none text-muted-foreground hover:bg-transparent hover:text-primary aria-disabled:opacity-50",
      defaultClassNames.button_previous,
    ),
    button_next: cn(
      buttonVariants({ variant: buttonVariant }),
      "size-(--cell-size) p-0 select-none text-muted-foreground hover:bg-transparent hover:text-primary aria-disabled:opacity-50",
      defaultClassNames.button_next,
    ),
    month_caption: cn(
      "!hidden", // oculta la caption nativa — Tailwind genera este class
      defaultClassNames.month_caption,
    ),
    month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
    weekdays: cn("flex", defaultClassNames.weekdays),
    weekday: cn(
      "flex-1 rounded-(--cell-radius) text-xs font-normal text-muted-foreground select-none",
      defaultClassNames.weekday,
    ),
    week: cn("mt-2 flex w-full", defaultClassNames.week),
    week_number_header: cn("w-(--cell-size) select-none", defaultClassNames.week_number_header),
    week_number: cn("text-xs text-muted-foreground select-none", defaultClassNames.week_number),
    day: cn(
      "group/day relative aspect-square h-full w-full rounded-(--cell-radius) p-0 text-center select-none [&:last-child[data-selected=true]_button]:rounded-r-(--cell-radius)",
      defaultClassNames.day,
    ),
    range_start: cn(
      "relative isolate z-0 rounded-l-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:right-0 after:w-4 after:bg-muted",
      defaultClassNames.range_start,
    ),
    range_middle: cn("rounded-none", defaultClassNames.range_middle),
    range_end: cn(
      "relative isolate z-0 rounded-r-(--cell-radius) bg-muted after:absolute after:inset-y-0 after:left-0 after:w-4 after:bg-muted",
      defaultClassNames.range_end,
    ),
    // Sin `bg-muted`: "hoy" ya se marca con el borde del propio botón, y el
    // fondo de la celda —que es cuadrada, `--cell-radius:0`, para que los
    // rangos se lean continuos— asomaba por detrás de ese botón redondeado.
    today: cn(
      "rounded-(--cell-radius) text-foreground data-[selected=true]:rounded-none",
      defaultClassNames.today,
    ),
    outside: cn(
      "text-muted-foreground aria-selected:text-muted-foreground",
      defaultClassNames.outside,
    ),
    disabled: cn("text-muted-foreground opacity-50", defaultClassNames.disabled),
    hidden: cn("invisible", defaultClassNames.hidden),
    ...classNames,
  }
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  color: _color,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames()

  const ref = React.useRef<HTMLButtonElement>(null)
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus()
  }, [modifiers.focused])

  return (
    <Button
      variant="ghost"
      color="neutral"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      data-today={modifiers.today}
      // Los días de relleno del mes anterior y del siguiente van apagados. Se
      // marca acá y no solo en la celda porque el botón trae su propio
      // `text-foreground` (ghost + neutral) y le ganaba al color de la celda.
      //
      // Se excluyen los seleccionados —un día de relleno también se puede
      // elegir—: ahí el color lo pone la selección, y calcularlo así evita
      // depender del orden en que Tailwind emita las dos reglas.
      data-outside={modifiers.outside && !modifiers.selected}
      className={cn(
        // Las celdas destacadas (hoy / seleccionada / extremos de rango)
        // llevan borde propio; el resto conserva el `border-transparent`
        // del Button, así todas miden lo mismo.
        "data-[today=true]:border-border data-[selected-single=true]:border-primary data-[range-start=true]:border-primary data-[range-end=true]:border-primary data-[range-middle=true]:border-muted",
        "data-[outside=true]:text-muted-foreground data-[outside=true]:hover:text-muted-foreground",
        "relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-(--cell-radius) data-[range-end=true]:rounded-r-(--cell-radius) data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-muted data-[range-middle=true]:text-foreground data-[range-start=true]:rounded-(--cell-radius) data-[range-start=true]:rounded-l-(--cell-radius) data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-foreground [&>span]:text-xs [&>span]:opacity-70",
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  )
}

export { Calendar, CalendarDayButton }
