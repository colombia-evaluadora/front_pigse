import { z } from "zod"

export const campusFiltersFormSchema = z.object({
  search: z.string(),
  zones: z.array(z.string()),
})

export type CampusFiltersFormInput = z.input<typeof campusFiltersFormSchema>

export type CampusFiltersFormValues = z.infer<typeof campusFiltersFormSchema>

export const campusesSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  sortBy: z.string().optional().catch(undefined),
  sortDir: z.enum(["asc", "desc"]).optional().catch(undefined),
  search: z.string().optional().catch(undefined),
  zones: z.array(z.string()).optional().catch(undefined),
})

export type CampusesSearch = z.infer<typeof campusesSearchSchema>