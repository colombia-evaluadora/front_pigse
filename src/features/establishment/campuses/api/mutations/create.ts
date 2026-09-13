import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"

import type { Campus, CampusDraft } from "@/features/establishment/campuses/api/types/campus"

export interface CreateResult {
  status: "ok" | "error"
  message: string
  campus: Campus
}

/**
 * El validador de placeholders de la plataforma recorre TODO el JSON del
 * body y exige que cada leaf tenga un tipo declarado en la query — no basta
 * con declarar `BODY.ZONE.ID`: si el objeto que se manda también trae
 * `.code`/`.name` (como `Campus["zone"]`, un `CatalogItem` completo), esos
 * dos leaves quedan sin declarar y la petición se rechaza entera (aunque
 * `.id` sí esté declarado). Por eso acá NO se manda el objeto completo:
 * `zone` sale aplanado a su `id` (`BODY.ZONE` a secas, ya no
 * `BODY.ZONE.ID` — la query se actualizó para matchear, ver id_query 89/90).
 *
 * Además:
 * - `commune` → `comune` (typo del backend, confirmado contra la query).
 * - `establishmentId` solo tiene sentido en el alta (`fn_sed_crear` lo
 *   necesita); en la actualización ni siquiera está declarado en la query
 *   (`FK_TESTABLECIMIENTO` es inmutable), así que si viaja igual el
 *   validador también lo rechaza — se saca explícitamente en `update`.
 * - `id` tampoco se manda en la actualización: el PK ya va en la URL
 *   (`PARAM.ID`), la query no tiene un `BODY.ID` declarado.
 */
function toRealCreatePayload(values: CampusDraft) {
  const { commune, zone, ...rest } = values
  return { ...rest, comune: commune, zone: zone?.id ?? null }
}

function toRealUpdatePayload(values: Campus) {
  const { commune, zone, id: _id, ...rest } = values as Campus & { establishmentId?: number | null }
  const { establishmentId: _establishmentId, ...withoutEstablishment } = rest
  return { ...withoutEstablishment, comune: commune, zone: zone?.id ?? null }
}

// El cliente no manda `id`: lo asigna el backend al crear.
export function create(values: CampusDraft): Promise<CreateResult> {
  return api.post(
    apiPath("/establishments/campuses", "/establecimientos/sedes"),
    env.ENABLE_API_MOCKING ? values : toRealCreatePayload(values),
  )
}

/**
 * PATCH, no PUT: el SSO real registra la actualización como
 * `PATCH /establecimientos/sedes/:ID` (`fn_sed_actualizar`). El PUT en ese
 * mismo path es la baja lógica (`fn_sed_soft_delete`), ver `delete.ts`.
 */
export function updateCampus(
  campusId: number,
  values: Campus
): Promise<CreateResult> {
  const url = apiPath(
    `/establishments/campuses/${campusId}`,
    `/establecimientos/sedes/${campusId}`,
  )
  const payload = env.ENABLE_API_MOCKING ? values : toRealUpdatePayload(values)
  return env.ENABLE_API_MOCKING ? api.put(url, payload) : api.patch(url, payload)
}
