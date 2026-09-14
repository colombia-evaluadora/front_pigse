import { api } from "@/lib/api-client"
import { unwrapRows } from "@/lib/response-envelope"

import type {
  Permission,
  PermissionStatus,
} from "@/features/establishment/institution/api/types/permission"

/** Elemento del array que espera `pigse.fn_fun_permisos_actualizar` (V370),
 * mismo contrato que `academico_test.fn_fun_permisos_actualizar` (V297). */
export type PermissionSyncItem =
  | {
      accion: "crear"
      orden: number
      fk_rol: number
      fk_sede: number
      fk_jornada: number
      fk_estado: "ACTIVO" | "INACTIVO"
    }
  | { accion: "eliminar"; id: number }

interface PermissionSyncResultRow {
  accion: string
  id: number
  status: string
}

const PERMISSION_STATUS_TO_TLV_ESTADO: Record<PermissionStatus, "ACTIVO" | "INACTIVO"> = {
  ACTIVE: "ACTIVO",
  SUSPENDED: "INACTIVO",
}

/**
 * Arma el `{accion:"crear", ...}` que pide el endpoint a partir de un
 * permiso del borrador (sin `id`: todavía no existe en TSEDE_USUARIO).
 * `campus` es la sede elegida en el form -- a diferencia de la versión
 * vieja de este archivo (previa a V370), PIGSE ahora SÍ tiene sede y
 * `fk_sede` es obligatorio para `fn_fun_permisos_actualizar`.
 */
export function toCrearItem(permission: Permission, campusId: number): PermissionSyncItem {
  return {
    accion: "crear",
    orden: permission.order,
    fk_rol: permission.role.id,
    fk_sede: campusId,
    fk_jornada: permission.workSchedule.id,
    fk_estado: PERMISSION_STATUS_TO_TLV_ESTADO[permission.status],
  }
}

/**
 * `PUT /funcionario/:id/permisos` -> `pigse.fn_fun_permisos_actualizar`
 * (V370). Solo tiene sentido en real: en mock los permisos siguen viajando
 * embebidos en el payload general del empleado (ver dialog-manage.tsx). No
 * soporta "editar" un permiso existente, solo crear/eliminar -- mismo
 * límite que documenta la función SQL.
 */
export async function updateEmployeePermissions(
  employeeId: number,
  permisos: PermissionSyncItem[],
): Promise<PermissionSyncResultRow[]> {
  const response = (await api.put(`/pigse/funcionario/${employeeId}/permisos`, {
    permisos,
  })) as unknown as { rows: PermissionSyncResultRow[] } | PermissionSyncResultRow[]
  return unwrapRows<PermissionSyncResultRow>(response)
}
