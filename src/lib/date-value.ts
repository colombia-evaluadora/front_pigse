import { format, parseISO } from "date-fns"

/**
 * Formato en el que los formularios de establecimiento guardan fechas sin
 * hora. Vive acá y no en cada formulario para que los distintos formularios
 * (períodos académicos, evaluación, filtros) no puedan desincronizarse del
 * handler que los parsea.
 */
export const DATE_VALUE_FORMAT = "yyyy-MM-dd"

/** String del formulario (`yyyy-MM-dd`) → `Date` para el `DatePicker`. */
export function parseDateValue(value: string): Date | undefined {
  return value ? parseISO(value) : undefined
}

/** `Date` del `DatePicker` → string del formulario (vacío cuando se limpia). */
export function formatDateValue(date: Date | undefined): string {
  return date ? format(date, DATE_VALUE_FORMAT) : ""
}
