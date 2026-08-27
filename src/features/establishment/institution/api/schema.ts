import { z } from "zod"

export const establishmentFiltersFormSchema = z.object({
  search: z.string(),
  statuses: z.array(z.string()),
})

export type EstablishmentFiltersFormInput = z.input<typeof establishmentFiltersFormSchema>

export type EstablishmentFiltersFormValues = z.infer<typeof establishmentFiltersFormSchema>

/**
 * Search params de la URL.
 * Se serializan/deserializan automáticamente por TanStack Router.
 */
export const establishmentsSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),

  pageSize: z.coerce.number().int().positive().catch(10).default(10),

  sortBy: z.string().optional().catch(undefined),

  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),

  search: z.string().optional().catch(undefined),

  statuses: z.array(z.string()).optional().catch(undefined),
})

export type EstablishmentsSearch = z.infer<typeof establishmentsSearchSchema>
