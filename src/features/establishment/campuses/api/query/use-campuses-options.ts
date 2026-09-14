import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { unwrapRows } from "@/lib/response-envelope"

export interface CampusOption {
  id: number
  name: string
  establishmentId: number
}

interface CampusesOptionsResult {
  rows: CampusOption[]
}

/**
 * Lista liviana (id + nombre + establecimiento) de sedes activas, para
 * selectores globales -- `GET /sedes/opciones` (V372). A diferencia de
 * CEVAL, esta variante NO trae el `Campus` completo (zona/barrio/comuna/
 * teléfono): esta app no tiene ningún selector que necesite ese detalle,
 * solo elegir A CUÁL sede se refiere algo (p.ej. el picker de sede al
 * asignar un rol a un funcionario).
 */
async function fetchCampusesOptions(): Promise<CampusOption[]> {
  if (env.ENABLE_API_MOCKING) {
    const result: CampusesOptionsResult = await api.get("/establishments/campuses/options")
    return result.rows
  }
  const response = (await api.get(
    apiPath("/establishments/campuses/options", "/sedes/opciones"),
  )) as unknown as CampusOption[] | { rows: CampusOption[] }
  return unwrapRows(response)
}

export function useCampusesOptionsQuery(enabled = true) {
  return useQuery({
    queryKey: ["campuses", "options"],
    queryFn: fetchCampusesOptions,
    enabled,
  })
}
