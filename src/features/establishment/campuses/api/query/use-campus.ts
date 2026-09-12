import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRow } from "@/lib/response-envelope"
import { env } from "@/config/env"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"

interface CampusQueryResult {
  status: "ok"
  campus: Campus
}

/** Fila cruda de `fn_sed_buscar_por_pk` (V52) — columnas sueltas de TSEDE,
 * `fk_tlv_zona` sin resolver (sin `code`/`name`, solo el id). */
interface RealCampusDetailRow {
  pk_tsede: number
  codigo: string
  nombre: string
  fk_tlv_zona: number | null
  fk_testablecimiento: number
  comuna: string | null
  barrio: string | null
  direccion: string | null
  telefono: string | null
}

/**
 * `zone` sale con `code`/`name` vacíos: la query no hace join contra
 * `TLISTA_VALOR` (`fn_sed_buscar_por_pk` no lo resuelve), solo trae el id.
 * El caller (dialog-manage.tsx) ya tiene el catálogo de zonas cargado para
 * completar el nombre — ver ahí.
 */
function toCampus(row: RealCampusDetailRow): Campus {
  return {
    id: row.pk_tsede,
    name: row.nombre,
    dane: row.codigo ?? "",
    zone: row.fk_tlv_zona === null ? null : { id: row.fk_tlv_zona, code: "", name: "" },
    neighborhood: row.barrio ?? "",
    commune: row.comuna ?? "",
    address: row.direccion ?? "",
    phone: row.telefono ?? "",
  }
}

async function fetchCampus(id: number): Promise<CampusQueryResult> {
  if (env.ENABLE_API_MOCKING) {
    return api.get(apiPath(`/establishments/campuses/${id}`, `/establecimientos/sedes/${id}`))
  }

  // fn_sed_buscar_por_pk (V52) — fila cruda envuelta en {rows:[...]}.
  const row = unwrapRow<RealCampusDetailRow>(
    (await api.get(`/eval-col/establecimientos/sedes/${id}`)) as unknown as
      | { rows: RealCampusDetailRow[] }
      | RealCampusDetailRow,
  )
  return { status: "ok", campus: toCampus(row) }
}

export function useCampusQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["campuses", id],
    queryFn: () => fetchCampus(id as number),
    enabled: enabled && Boolean(id),
  })
}
