import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import { toEmployeesQueryFilters } from "@/features/establishment/employees/api/query/use-employees"
import type { MutationConfig } from "@/lib/react-query"
import type { EmployeesQueryRequest } from "@/features/establishment/employees/api/types/employee"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/institution/api/types/export"

interface ExportEmployeesInput {
  filters: EmployeesQueryRequest["filters"]
  format: ExportFormat
}

function exportEmployees(input: ExportEmployeesInput): Promise<ExportResult> {
  // El reporte lo genera reporting-service con la MISMA funcion PL/pgSQL
  // que alimenta esta tabla, sin paginar: los filtros que no se mandan
  // llegan NULL y la funcion los ignora, o sea que sin filtros sale todo.
  // `downloadReport` dispara la descarga y devuelve el {status, message}
  // que este dialogo ya sabia consumir.
  // Los MISMOS filtros normalizados que manda el listado. Sin esta
  // conversión los `<Select>` mandan los ids como texto y el query-service
  // rechaza el bind BIGINT[] con 400: la tabla andaba y el reporte fallaba
  // sobre exactamente los mismos filtros.
  return downloadReport("funcionarios", {
    format: input.format,
    filters: toEmployeesQueryFilters(input.filters),
  })
}

interface UseExportOptions {
  mutationConfig?: MutationConfig<typeof exportEmployees>
}

export function useExport({ mutationConfig }: UseExportOptions = {}) {
  return useMutation({
    mutationFn: exportEmployees,
    ...mutationConfig,
  })
}
