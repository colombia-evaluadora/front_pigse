import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import { CATALOGS } from "@/lib/catalogs"
import { unwrapRows } from "@/lib/response-envelope"

import type { Municipality } from "@/features/establishment/institution/api/types/location"

/** Forma real de cada fila de GET /catalogos/municipios (V58, con el
 * departamento anidado ya resuelto — ver fn_cat_municipios_listar REV2). */
interface RealMunicipalityRow {
  pk_municipio: number
  nombre: string
  pk_departamento: number
  departamento_nombre: string
}

async function fetchMunicipalities(): Promise<Municipality[]> {
  // TMUNICIPIO no es TLISTA_VALOR: no lo cubre el catálogo genérico
  // `/select/:categoria` (ver use-catalogs.ts), tiene su propio endpoint
  // (V58, todavía en postgres/pending/step5_catalogos_v58.sql).
  if (env.ENABLE_API_MOCKING) {
    return getCatalog<Municipality>(CATALOGS.MUNICIPALITIES)
  }
  // `api` (no `fetch` crudo): agrega el `Authorization: Bearer <token>` que
  // el gateway real exige — sin eso responde 403 antes de llegar a la query.
  const response = (await api.get("/eval-col/catalogos/municipios")) as unknown as
    | { rows: RealMunicipalityRow[] }
    | RealMunicipalityRow[]
  const rows = unwrapRows<RealMunicipalityRow>(response)
  return rows.map((row) => ({
    id: row.pk_municipio,
    name: row.nombre,
    department: { id: row.pk_departamento, name: row.departamento_nombre },
  }))
}

export function useMunicipalitiesQuery() {
  return useQuery({
    queryKey: ["catalogs", "municipalities"],
    queryFn: fetchMunicipalities,
  })
}
