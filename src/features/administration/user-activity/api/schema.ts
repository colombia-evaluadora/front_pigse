import { z } from "zod"

import { USER_ACTIVITY_STATUSES } from "@/features/administration/user-activity/api/types/user-activity"

/**
 * `establecimientoId` viaja como string vacío ("sin filtro") o el id como
 * texto — mismo criterio que `status` en `auditFiltersFormSchema`: el campo
 * de la barra de búsqueda (`search`) va acá también, unificado con los del
 * popover de filtros avanzados (`estado`/`establecimientoId`), porque
 * `useQuerySearch` necesita el estado completo para poder reescribir el
 * texto del input cuando cambia por fuera (popover, "limpiar todo").
 */
export const userActivityFiltersFormSchema = z.object({
  search: z.string(),
  establecimientoId: z.string(),
  estado: z.string(),
})
export type UserActivityFiltersFormInput = z.input<typeof userActivityFiltersFormSchema>
export type UserActivityFiltersFormValues = z.infer<typeof userActivityFiltersFormSchema>

export const userActivitySearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  establecimientoId: z.coerce.number().optional().catch(undefined),
  estado: z.enum(USER_ACTIVITY_STATUSES).optional().catch(undefined),
})
export type UserActivitySearch = z.infer<typeof userActivitySearchSchema>
