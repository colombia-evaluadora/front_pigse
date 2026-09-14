import { z } from "zod"

export const employeeFiltersFormSchema = z.object({
  search: z.string(),
})

export type EmployeeFiltersFormInput = z.input<typeof employeeFiltersFormSchema>

export type EmployeeFiltersFormValues = z.infer<typeof employeeFiltersFormSchema>

export const employeesSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  search: z.string().optional().catch(undefined),
})

export type EmployeesSearch = z.infer<typeof employeesSearchSchema>
