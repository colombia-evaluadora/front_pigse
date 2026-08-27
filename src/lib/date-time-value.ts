import { format, parseISO } from "date-fns"

/**
 * Formato en el que los filtros mandan fecha+hora al backend. Vive acá y no
 * en cada formulario para que los tres filtros de auditoría no puedan
 * desincronizarse del handler que los parsea.
 */
export const DATE_TIME_VALUE_FORMAT = "yyyy-MM-dd'T'HH:mm"

/** Solo fecha en formato ISO corto (`yyyy-MM-dd`), el mismo que entrega
 *  un `<input type="date">` nativo y el que esperan los modelos `Person`
 *  y `EstablishmentDetails` como `birthDate` / `licenseDate`. */
export const DATE_VALUE_FORMAT = "yyyy-MM-dd"

/** String del formulario → `Date` para los pickers. */
export function parseDateTimeValue(value: string): Date | undefined {
  return value ? parseISO(value) : undefined
}

/** `Date` del picker → string del formulario (vacío cuando se limpia). */
export function formatDateTimeValue(date: Date | undefined): string {
  return date ? format(date, DATE_TIME_VALUE_FORMAT) : ""
}

/**
 * String `yyyy-MM-dd` (o vacío) → `Date | undefined` para alimentar
 * `<DatePicker mode="date">`. Vacío se mapea a `undefined` para que el
 * picker muestre el placeholder en lugar de "1 ene 1970".
 */
export function parseDateValue(value: string | null | undefined): Date | undefined {
  return value ? parseISO(value) : undefined
}

/**
 * `Date | undefined` del picker → string `yyyy-MM-dd` (o `null` cuando
 * se limpia) para preservar el modelo `string | null` que ya esperan
 * `EstablishmentDetails.licenseDate` y similares.
 */
export function formatDateValue(date: Date | undefined): string | null {
  return date ? format(date, DATE_VALUE_FORMAT) : null
}
