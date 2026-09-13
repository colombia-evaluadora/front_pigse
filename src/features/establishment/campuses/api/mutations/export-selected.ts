import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import type { MutationConfig } from "@/lib/react-query"
import type { ExportFormat, ExportResult } from "@/features/establishment/institution/api/types/export"

interface ExportSelectedCampusesInput {
  ids: number[]
  format: ExportFormat
}

function exportSelectedCampuses(input: ExportSelectedCampusesInput): Promise<ExportResult> {
  // Exportar los seleccionados NO es otro endpoint: es el mismo reporte con
  // un filtro mas. `ids` viaja entre los filtros y el SQL de la fila
  // …/reporte lo aplica DESPUES de que la funcion PL/pgSQL corrio su gate,
  // asi que mandar el id de algo que este usuario no puede ver no lo revela
  // — simplemente no aparece.
  return downloadReport("sedes", { format: input.format, filters: { ids: input.ids } })
}

interface UseExportSelectedOptions {
  mutationConfig?: MutationConfig<typeof exportSelectedCampuses>
}

export function useExportSelected({
  mutationConfig,
}: UseExportSelectedOptions = {}) {
  return useMutation({
    mutationFn: exportSelectedCampuses,
    ...mutationConfig,
  })
}
