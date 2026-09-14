import { z } from "zod"

import { EMPLOYEE_STATUSES } from "@/features/establishment/employees/api/types/employee"

export const employeeFiltersFormSchema = z.object({
  search: z.string(),
  // Rol y jornada viajan por NOMBRE, no por id ni por código:
  // `pigse.fn_fun_listar` (V386) matchea `public.role.name` y
  // `TLISTA_VALOR.NOMBRE` contra sendos `VARCHAR[]`.
  roles: z.array(z.string()),
  workSchedules: z.array(z.string()),
  statuses: z.array(z.enum(EMPLOYEE_STATUSES)),
})

export type EmployeeFiltersFormInput = z.input<typeof employeeFiltersFormSchema>

export type EmployeeFiltersFormValues = z.infer<typeof employeeFiltersFormSchema>

export const employeesSearchSchema = z.object({
  page: z.coerce.number().int().nonnegative().catch(0).default(0),
  pageSize: z.coerce.number().int().positive().catch(10).default(10),
  search: z.string().optional().catch(undefined),
  roles: z.array(z.string()).optional().catch(undefined),
  workSchedules: z.array(z.string()).optional().catch(undefined),
  statuses: z.array(z.enum(EMPLOYEE_STATUSES)).optional().catch(undefined),
})

export type EmployeesSearch = z.infer<typeof employeesSearchSchema>
