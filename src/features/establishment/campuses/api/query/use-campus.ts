import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { unwrapRow } from "@/lib/response-envelope"
import { env } from "@/config/env"

import type { Campus } from "@/features/establishment/campuses/api/types/campus"

interface CampusQueryResult {
  status: "ok"
  campus: Campus
}

/** Fila cruda de `pigse.fn_sed_buscar_por_pk` (V370). */
interface RealCampusDetailRow {
  pk_sede: number
  codigo: string
  nombre: string
  consecutivo: string
  fk_tlv_zona: number | null
  localidad: string | null
  comuna: string | null
  barrio: string | null
  direccion: string | null
  telefono: string | null
  fk_establecimiento: number
  establecimiento_nombre: string
  georeferenciacion: string | null
}

function toCampus(row: RealCampusDetailRow): Campus {
  return {
    id: row.pk_sede,
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
    return api.get(`/establishments/campuses/${id}`)
  }

  // GET /pigse/sedes/:id -- fila cruda envuelta en {rows:[...]}.
  const row = unwrapRow<RealCampusDetailRow>(
    (await api.get(`/pigse/sedes/${id}`)) as unknown as
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
