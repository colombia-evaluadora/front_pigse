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
 * Adapta el `Campus`/`CampusDraft` del front (inglés, `zone` como
 * `CatalogItem`) al contrato de `pigse.fn_sed_crear`/`fn_sed_actualizar`
 * (V370/V371): binds top-level en español (`codigo`, `nombre`, `fkTlvZona`,
 * `fkEstablecimiento`, `barrio`, `comuna`, `direccion`, `telefono`) --
 * `zone` se aplana a su `id` porque el validador de placeholders rechaza un
 * `CatalogItem` completo donde solo se declaró un escalar.
 */
function toRealCreatePayload(values: CampusDraft) {
  return {
    codigo: values.dane,
    nombre: values.name,
    fkTlvZona: values.zone?.id ?? null,
    fkEstablecimiento: values.establishmentId,
    barrio: values.neighborhood || undefined,
    comuna: values.commune || undefined,
    direccion: values.address || undefined,
    telefono: values.phone || undefined,
  }
}

function toRealUpdatePayload(values: Campus) {
  return {
    codigo: values.dane || undefined,
    nombre: values.name || undefined,
    fkTlvZona: values.zone?.id ?? undefined,
    barrio: values.neighborhood || undefined,
    comuna: values.commune || undefined,
    direccion: values.address || undefined,
    telefono: values.phone || undefined,
  }
}

// El cliente no manda `id`: lo asigna el backend al crear.
export function create(values: CampusDraft): Promise<CreateResult> {
  return api.post(
    apiPath("/establishments/campuses", "/sedes"),
    env.ENABLE_API_MOCKING ? values : toRealCreatePayload(values),
  )
}

/**
 * PUT, no PATCH: `pigse.fn_sed_actualizar` (V370) se registró como
 * `PUT /sedes/:ID` -- el PATCH en ese mismo path es la baja lógica
 * (`fn_sed_soft_delete`, ver `delete.ts`). Convención opuesta a como estaba
 * documentada acá para CEVAL; PIGSE sigue PUT=actualizar/PATCH=eliminar en
 * todo el resto del módulo (funcionarios, V257/V369).
 */
export function updateCampus(campusId: number, values: Campus): Promise<CreateResult> {
  const url = apiPath(`/establishments/campuses/${campusId}`, `/sedes/${campusId}`)
  const payload = env.ENABLE_API_MOCKING ? values : toRealUpdatePayload(values)
  return api.put(url, payload)
}
