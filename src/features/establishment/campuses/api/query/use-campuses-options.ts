import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRows } from "@/lib/response-envelope"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"

interface CampusesOptionsResult {
  rows: Campus[]
}

/** Fila cruda de GET /establecimientos/sedes/opciones (fn_sed_listar_todos,
 * V52 REV2 — ya trae el `Campus` completo, no solo id/nombre). */
interface RealCampusOptionRow {
  pk_sede: number
  codigo: string
  nombre: string
  fk_tlv_zona: number | null
  zona_nombre: string | null
  barrio: string
  comuna: string
  direccion: string
  telefono: string
  fk_establecimiento: number
}

function toCampus(row: RealCampusOptionRow): Campus {
  return {
    id: row.pk_sede,
    name: row.nombre,
    dane: row.codigo,
    zone: row.fk_tlv_zona
      ? { id: row.fk_tlv_zona, code: String(row.fk_tlv_zona), name: row.zona_nombre ?? "" }
      : null,
    neighborhood: row.barrio,
    commune: row.comuna,
    address: row.direccion,
    phone: row.telefono,
  }
}

async function fetchCampusesOptions(): Promise<Campus[]> {
  if (env.ENABLE_API_MOCKING) {
    const result: CampusesOptionsResult = await api.get("/establishments/campuses/options")
    return result.rows
  }
  const response = (await api.get(
    apiPath("/establishments/campuses/options", "/establecimientos/sedes/opciones"),
  )) as unknown as RealCampusOptionRow[] | { rows: RealCampusOptionRow[] }
  return unwrapRows(response).map(toCampus)
}

export function useCampusesOptionsQuery() {
  return useQuery({
    queryKey: ["campuses", "options"],
    queryFn: fetchCampusesOptions,
  })
}
