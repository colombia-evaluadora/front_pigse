import { z } from "zod"

export const SESSION_STATUSES = ["active", "closed"] as const

/**
 * Los filtros no tienen campos obligatorios —filtrar por nada es válido—, así
 * que lo único que se valida es la coherencia del rango: si el usuario cargó
 * las dos fechas, la de fin no puede quedar antes que la de inicio.
 *
 * La comparación es de strings porque `DATE_TIME_VALUE_FORMAT` es ISO
 * (`yyyy-MM-ddTHH:mm`) y en ese formato el orden lexicográfico coincide con el
 * cronológico; no hace falta reconstruir un `Date`.
 *
 * El issue se ancla en el campo "hasta", que es el que el usuario debe mover.
 */
function refineDateRange<T extends Record<string, unknown>>(
  from: keyof T & string,
  to: keyof T & string,
) {
  return (value: T, ctx: { addIssue: (issue: { code: "custom"; path: string[]; message: string }) => void }) => {
    const start = String(value[from] ?? "")
    const end = String(value[to] ?? "")

    if (start && end && end < start) {
      ctx.addIssue({
        code: "custom",
        path: [to],
        message: "La fecha final no puede ser anterior a la inicial.",
      })
    }
  }
}

export const auditFiltersFormSchema = z.object({
  author: z.string(),
  // Selección única (`ToggleGroup` con `multiple={false}`). El string vacío
  // es "sin filtro". La URL/serialización siguen esperando un array
  // (`statuses`) — la conversión se hace en `useAuditSessionFilters`.
  status: z.string(),
  // yyyy-MM-dd, string en vez de Date para que el form/URL los serialicen igual.
  startedFrom: z.string(),
  startedTo: z.string(),
}).superRefine(refineDateRange("startedFrom", "startedTo"))
export type AuditFiltersFormInput = z.input<typeof auditFiltersFormSchema>
export type AuditFiltersFormValues = z.infer<typeof auditFiltersFormSchema>

export const auditsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  author: z.string().optional().catch(undefined),
  statuses: z.array(z.enum(SESSION_STATUSES)).optional().catch(undefined),
  startedFrom: z.string().optional().catch(undefined),
  startedTo: z.string().optional().catch(undefined),
})
export type AuditsSearch = z.infer<typeof auditsSearchSchema>

export const OPERATION_TYPES = ["INSERT", "UPDATE", "DELETE"] as const

// El campo a filtrar es dinámico (varía por tabla auditada: "Código",
// "Nombre", etc. para tnivel_ensenanza; otro set para tdepartamento, etc.),
// así que el schema lo valida como string. La UI del sheet recibe la
// lista disponible por tabla y la muestra en el Select.

export const FIELD_FILTER_CONDITIONS = ["contains", "equals", "startsWith"] as const
export type FieldFilterCondition = (typeof FIELD_FILTER_CONDITIONS)[number]

export const FIELD_FILTER_CONDITION_LABELS: Record<FieldFilterCondition, string> = {
  contains: "Contiene",
  equals: "Es igual a",
  startsWith: "Empieza con",
}

export const fieldFilterSchema = z.object({
  field: z.string().min(1),
  condition: z.enum(FIELD_FILTER_CONDITIONS),
  value: z.string().min(1),
})
export type FieldFilter = z.infer<typeof fieldFilterSchema>

export const tableOperationsFiltersFormSchema = z.object({
  author: z.string(),
  operations: z.array(z.enum(OPERATION_TYPES)),
  occurredFrom: z.string(),
  occurredTo: z.string(),
  fieldFilters: z.array(fieldFilterSchema),
}).superRefine(refineDateRange("occurredFrom", "occurredTo"))
export type TableOperationsFiltersFormInput = z.input<typeof tableOperationsFiltersFormSchema>
export type TableOperationsFiltersFormValues = z.infer<typeof tableOperationsFiltersFormSchema>

export const tableOperationsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  // El filtro busca por autor o por IP, y el nombre del parámetro lo dice:
  // `?author_ip=…`. Es también la clave del término en el buscador.
  author_ip: z.string().optional().catch(undefined),
  operations: z.array(z.enum(OPERATION_TYPES)).optional().catch(undefined),
  occurredFrom: z.string().optional().catch(undefined),
  occurredTo: z.string().optional().catch(undefined),
  // El router URL-encodea y JSON-parsea los search params automáticamente;
  // pasar el array directo evita el doble encoding que rompe el refresh.
  fieldFilters: z.array(fieldFilterSchema).optional().catch(undefined),
})
export type TableOperationsSearch = z.infer<typeof tableOperationsSearchSchema>

// Las cards de "auditoría por tabla" no tienen filtros propios todavía,
// solo paginación + orden (mismo set que las otras search schemas).
export const auditTablesFiltersFormSchema = z.object({
  name: z.string(),
})
export type AuditTablesFiltersFormInput = z.input<typeof auditTablesFiltersFormSchema>
export type AuditTablesFiltersFormValues = z.infer<typeof auditTablesFiltersFormSchema>

export const auditTablesSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  name: z.string().optional().catch(undefined),
})
export type AuditTablesSearch = z.infer<typeof auditTablesSearchSchema>

// Filtros del listado de operaciones dentro de una sesión. A diferencia
// de `tableOperationsSearchSchema`, no hay `author` (todas las ops son
// del mismo autor — el de la sesión) ni `fieldFilters` (dependen de la
// tabla y acá pueden ser N tablas). Sí hay un `tableSlug` libre para
// acotar a una sola tabla dentro de la sesión.
export const sessionOperationsFiltersFormSchema = z.object({
  operations: z.array(z.enum(OPERATION_TYPES)),
  tableSlug: z.string(),
  occurredFrom: z.string(),
  occurredTo: z.string(),
}).superRefine(refineDateRange("occurredFrom", "occurredTo"))
export type SessionOperationsFiltersFormInput = z.input<typeof sessionOperationsFiltersFormSchema>
export type SessionOperationsFiltersFormValues = z.infer<typeof sessionOperationsFiltersFormSchema>

export const sessionOperationsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  operations: z.array(z.enum(OPERATION_TYPES)).optional().catch(undefined),
  tableSlug: z.string().optional().catch(undefined),
  occurredFrom: z.string().optional().catch(undefined),
  occurredTo: z.string().optional().catch(undefined),
})
export type SessionOperationsSearch = z.infer<typeof sessionOperationsSearchSchema>
