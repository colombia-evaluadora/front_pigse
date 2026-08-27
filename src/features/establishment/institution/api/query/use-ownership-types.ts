import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { getCatalog } from "@/features/establishment/employees/api/query/use-catalogs"
import type { CatalogItem } from "@/types/catalog"
import { CATALOGS } from "@/lib/catalogs"
import { unwrapRows } from "@/lib/response-envelope"

interface RealOwnershipTypeRow {
  pk_propiedad_juridica: number
  codigo: string
  nombre: string
}

async function fetchOwnershipTypes(): Promise<CatalogItem[]> {
  // TPROPIEDAD_JURIDICA no es TLISTA_VALOR: no lo cubre el catálogo
  // genérico `/select/:categoria` (ver use-catalogs.ts). Ojo: existe una
  // categoría "PROPIEDAD_JURIDICA_OFICIAL" en tlista_valor, pero es otra
  // cosa — el FK real que usa fn_est_crear (p_fk_propiedad_juridica)
  // apunta a TPROPIEDAD_JURIDICA, no a esa categoría.
  if (env.ENABLE_API_MOCKING) {
    return getCatalog<CatalogItem>(CATALOGS.LEGAL_TYPES)
  }
  // `api` (no `fetch` crudo): agrega el `Authorization: Bearer <token>` que
  // el gateway real exige — sin eso responde 403 antes de llegar a la query.
  const response = (await api.get("/eval-col/catalogos/propiedad-juridica")) as unknown as
    | { rows: RealOwnershipTypeRow[] }
    | RealOwnershipTypeRow[]
  const rows = unwrapRows<RealOwnershipTypeRow>(response)
  return rows.map((row) => ({
    id: row.pk_propiedad_juridica,
    code: row.codigo,
    name: row.nombre,
  }))
}

export function useOwnershipTypesQuery() {
  return useQuery({
    queryKey: ["catalogs", "ownership-types"],
    queryFn: fetchOwnershipTypes,
  })
}
