import { api } from "@/lib/api-client"

/**
 * Cliente del microservicio `pigse` (roles, menús y planes).
 *
 * Dos cosas lo separan del resto de las llamadas a `api`:
 *
 * 1. **Prefijo.** El gateway rutea este microservicio bajo `/api/pigse`;
 *    `api` ya trae `/api` como baseURL, así que acá solo se agrega `/pigse`.
 *
 * 2. **Sobre `{rows}`.** Todo lo que sale por path-dispatch lo envuelve
 *    `QueryPathController` en `{rows: [...], outParams: {...}}`, incluso cuando
 *    el DTO documentado es un objeto suelto o una lista de escalares: una fila
 *    de una sola columna no colapsa a escalar, llega como `{id: 1}`. Los DTOs
 *    de `docs/roles-permisos-dtos.md` describen lo de adentro de `rows`, no el
 *    body completo — desenvolverlo acá es lo que hace que las queries y
 *    mutaciones sigan viendo el contrato documentado.
 *
 * Los arrays sueltos también se aceptan: así el mismo código sirve contra los
 * handlers de MSW aunque alguno todavía responda sin sobre.
 */

const PREFIX = "/pigse"

interface RowsEnvelope<T> {
  rows?: T[]
  outParams?: Record<string, unknown>
}

function toRows<T>(body: unknown): T[] {
  if (Array.isArray(body)) return body as T[]
  return (body as RowsEnvelope<T> | null | undefined)?.rows ?? []
}

/**
 * Primera fila de la respuesta. Un alta o una edición que responde sin filas
 * es un error del backend, no un resultado vacío: se corta acá para que la
 * pantalla no siga con un objeto a medio armar.
 */
function toRow<T>(body: unknown, url: string): T {
  const [row] = toRows<T>(body)
  if (row === undefined) {
    throw new Error(`La respuesta de ${url} no trajo datos.`)
  }
  return row
}

export const pigse = {
  /** GET que devuelve una lista (`{rows:[...]}` → `T[]`). */
  async getRows<T>(url: string): Promise<T[]> {
    return toRows<T>(await api.get(`${PREFIX}${url}`))
  },

  /** POST que devuelve un único recurso (`{rows:[dto]}` → `dto`). */
  async postRow<T>(url: string, data?: unknown): Promise<T> {
    return toRow<T>(await api.post(`${PREFIX}${url}`, data), url)
  },

  /** PATCH que devuelve un único recurso. */
  async patchRow<T>(url: string, data?: unknown): Promise<T> {
    return toRow<T>(await api.patch(`${PREFIX}${url}`, data), url)
  },

  /** PUT que devuelve un único recurso (típicamente `{status, message}`). */
  async putRow<T>(url: string, data?: unknown): Promise<T> {
    return toRow<T>(await api.put(`${PREFIX}${url}`, data), url)
  },

  /** PUT sin cuerpo de interés: alcanza con que no haya fallado. */
  async put(url: string, data?: unknown): Promise<void> {
    await api.put(`${PREFIX}${url}`, data)
  },
}
