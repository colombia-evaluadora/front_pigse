import * as React from "react"
import { format, setHours, setMinutes } from "date-fns"
import { es } from "date-fns/locale"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon, ClockIcon } from "@/components/ui/icons"
import { inputTriggerVariants, inputVariants, useInputVariant } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/overlay/popover"
import { Separator } from "@/components/ui/separator"
import { TimePickerPanel, formatTimeLabel } from "@/components/ui/time-picker"

type PickerBaseProps = VariantProps<typeof inputVariants> & {
  /** Texto cuando no hay valor; ocupa el lugar del `placeholder` del input. */
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
  align?: React.ComponentProps<typeof PopoverContent>["align"]
  "aria-invalid"?: boolean
  "aria-describedby"?: string
  /**
   * Último día seleccionable — los posteriores quedan deshabilitados en el
   * calendario (no solo marcados como error tras elegirlos). Por ejemplo,
   * `maxDate={new Date()}` en "Fecha de nacimiento" evita elegir una fecha
   * futura.
   */
  maxDate?: Date
  /** Primer día seleccionable -- los anteriores quedan deshabilitados. Por ejemplo, el "Hasta" de un rango usa `minDate` = la fecha "Desde" elegida. */
  minDate?: Date
}

type DatePickerProps = PickerBaseProps &
  (
    | {
        /** Solo calendario. Es el modo por defecto. */
        mode?: "date"
        value?: Date
        onChange?: (value: Date | undefined) => void
        /** Formato de `date-fns` para el texto del trigger. */
        dateFormat?: string
      }
    | {
        /** Calendario + hora en el mismo popover. */
        mode: "datetime"
        value?: Date
        onChange?: (value: Date | undefined) => void
        dateFormat?: string
      }
    | {
        /** Solo hora, en 24h (`"HH:mm"`); se muestra en 12h con AM/PM. */
        mode: "time"
        value?: string
        onChange?: (value: string) => void
      }
  )

const DEFAULT_PLACEHOLDER = {
  date: "Elegir fecha",
  time: "Elegir hora",
  datetime: "Elegir fecha y hora",
} as const

const DEFAULT_FORMAT = {
  date: "dd/MM/yyyy",
  datetime: "dd/MM/yyyy, HH:mm",
} as const

/**
 * Selector de fecha y/u hora que se ve y se comporta como un `Input`: comparte
 * `inputVariants` y lee la variante del `Field` contenedor por contexto, así
 * que dentro de un `<Field variant="outlined">` con su `FieldLabel` flotante
 * se alinea igual que cualquier input del formulario.
 *
 * El `mode` decide qué panel se abre y de qué tipo es el valor: `Date` en
 * `date`/`datetime`, `"HH:mm"` en `time`.
 */
function DatePicker(props: DatePickerProps) {
  const {
    mode = "date",
    placeholder = DEFAULT_PLACEHOLDER[mode],
    variant,
    align = "start",
    className,
    id,
    disabled,
    maxDate,
    minDate,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedby,
  } = props

  const [open, setOpen] = React.useState(false)

  const resolvedVariant = useInputVariant(variant)

  // En `time` el valor es un string y no hay fecha; en el resto la hora se
  // deriva de la fecha para alimentar el panel de reloj.
  const dateValue = props.mode === "time" ? undefined : props.value
  const timeValue =
    props.mode === "time" ? props.value : dateValue ? format(dateValue, "HH:mm") : undefined

  const displayValue =
    props.mode === "time"
      ? formatTimeLabel(timeValue)
      : dateValue
        ? format(
            dateValue,
            props.dateFormat ??
              (props.mode === "datetime" ? DEFAULT_FORMAT.datetime : DEFAULT_FORMAT.date),
            { locale: es },
          )
        : undefined

  function handleSelectDate(date: Date | undefined) {
    if (props.mode === "time") return
    // El calendario devuelve el día a medianoche: si ya había hora elegida,
    // la conservamos en vez de resetearla a las 00:00.
    props.onChange?.(
      date && props.value
        ? setMinutes(setHours(date, props.value.getHours()), props.value.getMinutes())
        : date,
    )
    // En `datetime` el popover sigue abierto: falta elegir la hora.
    if (props.mode !== "datetime") setOpen(false)
  }

  function handleChangeTime(time: string) {
    const [hours, minutes] = time.split(":").map(Number)
    if (props.mode === "time") {
      props.onChange?.(time)
      return
    }
    props.onChange?.(setMinutes(setHours(props.value ?? new Date(), hours), minutes))
  }

  const Icon = mode === "time" ? ClockIcon : CalendarIcon

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            data-slot="date-picker"
            id={id}
            disabled={disabled}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            className={cn(
              inputVariants({ variant: resolvedVariant }),
              inputTriggerVariants({ variant: resolvedVariant }),
              "flex items-center gap-2 text-left",
              !displayValue && "text-muted-foreground",
              className,
            )}
          />
        }
      >
        <span className="min-w-0 flex-1 truncate">{displayValue ?? placeholder}</span>
        <Icon className="text-muted-foreground size-4 shrink-0" aria-hidden="true" />
      </PopoverTrigger>

      {/* El `ring` del popover casi no se ve sobre el fondo del diálogo: el
          borde es lo que separa el calendario de lo que hay detrás. */}
      <PopoverContent className="w-auto gap-0 border border-border p-0" align={align}>
        {mode === "time" ? (
          <TimePickerPanel value={timeValue} onChange={handleChangeTime} />
        ) : (
          <>
            <Calendar
              mode="single"
              selected={dateValue}
              onSelect={handleSelectDate}
              locale={es}
              disabled={
                maxDate && minDate
                  ? [{ after: maxDate }, { before: minDate }]
                  : maxDate
                    ? { after: maxDate }
                    : minDate
                      ? { before: minDate }
                      : undefined
              }
            />
            {/* En `datetime` la hora va detrás de un botón: el panel de reloj
                no entra al lado del calendario sin desbordar el popover. */}
            {mode === "datetime" && (
              <>
                <Separator />
                <Popover>
                  <PopoverTrigger
                    render={
                      <Button
                        size="sm"
                        type="button"
                        variant="ghost"
                        className="w-full justify-start rounded-none font-normal"
                      />
                    }
                  >
                    <ClockIcon data-icon="inline-start" />
                    {formatTimeLabel(timeValue) ?? "--:--"}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto border border-border p-0" align="start">
                    <TimePickerPanel value={timeValue} onChange={handleChangeTime} />
                  </PopoverContent>
                </Popover>
              </>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
