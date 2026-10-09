import { z } from "zod"

/**
 * Search params del tablero de Monitoreo. Los filtros viven en la URL (antes
 * estaban en estado local y se perdían al volver del detalle documental): el
 * monitor entra a un EE, revisa sus anexos y al volver encuentra la lista
 * tal como la dejó. Una URL inválida nunca tira: todo cae a `undefined`.
 */
const csv = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => (Array.isArray(value) ? value : value.split(",")).filter(Boolean))
  .optional()
  .catch(undefined)

export const monitoringSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  pei: csv,
  pec: csv,
  pmi: csv,
  pfi: csv,
  plazo: csv,
  etnias: z.enum(["S", "N"]).optional().catch(undefined),
})

export type MonitoringSearch = z.infer<typeof monitoringSearchSchema>
