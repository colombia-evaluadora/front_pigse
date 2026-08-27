import type { CatalogItem } from "@/types/catalog"

export type PermissionStatus = "ACTIVE" | "SUSPENDED"

/**
 * `TSEDE_USUARIO.TLV_ESTADO` ('ACTIVO'/'INACTIVO', mapeado acá) es un
 * dominio fijo de la tabla, no un catálogo real — no tiene fila en
 * `TLISTA_VALOR`, así que el select de estado del permiso no debe salir de
 * una consulta a catálogo (antes reusaba `CATALOGS.ENTITY_STATUSES`, que en
 * realidad apunta a `ESTADO_ESTABLECIMIENTO` — otro dominio, coincidencia
 * de mock). Son estas dos opciones fijas, siempre.
 */
export const PERMISSION_STATUS_OPTIONS: { code: PermissionStatus; name: string }[] = [
  { code: "ACTIVE", name: "Activo" },
  { code: "SUSPENDED", name: "Suspendido" },
]

export interface Permission {
  /**
   * `PK_TUSUARIO_FUNCIONARIO` real. Ausente mientras el permiso solo vive en
   * el borrador del front (agregado con "Agregar" y no persistido todavía) —
   * `dialog-manage.tsx` lo usa para distinguir, al guardar en real, cuáles
   * permisos son altas nuevas (sin `id`) y cuáles bajas de uno existente
   * (con `id`, ya no está en el borrador actual). Siempre ausente en mock.
   */
  id?: number

  order: number

  role: CatalogItem

  workSchedule: CatalogItem

  status: PermissionStatus
}
