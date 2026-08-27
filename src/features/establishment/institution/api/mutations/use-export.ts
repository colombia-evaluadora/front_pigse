import { useMutation } from "@tanstack/react-query"

import { downloadReport } from "@/lib/report-client"
import { toEstablishmentsQueryFilters } from "@/features/establishment/institution/api/query/use-establishments"
import type { MutationConfig } from "@/lib/react-query"
import type { EstablishmentsQueryRequest } from "@/features/establishment/institution/api/types/establishment"
import type {
  ExportFormat,
  ExportResult,
} from "@/features/establishment/institution/api/types/export"

interface ExportEstablishmentsInput {
  filters: EstablishmentsQueryRequest["filters"]
  format: ExportFormat
}

function exportEstablishments(input: ExportEstablishmentsInput): Promise<ExportResult> {
  // El reporte lo genera reporting-service con la MISMA funcion PL/pgSQL
  // que alimenta esta tabla, sin paginar: los filtros que no se mandan
  // llegan NULL y la funcion los ignora, o sea que sin filtros sale todo.
  // `downloadReport` dispara la descarga y devuelve el {status, message}
  // que este dialogo ya sabia consumir.
  // Los MISMOS filtros normalizados que manda el listado. Sin esta
  // conversión los `<Select>` mandan los ids como texto y el query-service
  // rechaza el bind BIGINT[] con 400: la tabla andaba y el reporte fallaba
  // sobre exactamente los mismos filtros.
  return downloadReport("establecimientos", {
    format: input.format,
    filters: toEstablishmentsQueryFilters(input.filters),
  })
}

interface UseExportOptions {
  mutationConfig?: MutationConfig<typeof exportEstablishments>
}

export function useExport({ mutationConfig }: UseExportOptions = {}) {
  return useMutation({
    mutationFn: exportEstablishments,
    ...mutationConfig,
  })
}
