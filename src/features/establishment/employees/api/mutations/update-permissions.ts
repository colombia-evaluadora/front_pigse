import { api } from "@/lib/api-client"
import { unwrapRows } from "@/lib/response-envelope"

import type {
  Permission,
  PermissionStatus,
} from "@/features/establishment/institution/api/types/permission"

/** Elemento del array que espera `fn_fun_permisos_actualizar` (V51). */
export type PermissionSyncItem =
  | {
      accion: "crear"
      orden: number
      fk_rol: number
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

/** Arma el `{accion:"crear", ...}` que pide el endpoint a partir de un
 * permiso del borrador (sin `id`: todavía no existe en TTUSUARIO_FUNCIONARIO). */
export function toCrearItem(permission: Permission): PermissionSyncItem {
  return {
    accion: "crear",
    orden: permission.order,
    fk_rol: permission.role.id,
    fk_jornada: permission.workSchedule.id,
    fk_estado: PERMISSION_STATUS_TO_TLV_ESTADO[permission.status],
  }
}

/**
 * PUT /funcionario/:id/permisos (fn_fun_permisos_actualizar, V51). Solo
 * tiene sentido en real: en mock los permisos siguen viajando embebidos en
 * el payload general del empleado (ver dialog-manage.tsx). No soporta
 * "editar" un permiso existente, solo crear/eliminar — mismo límite que
 * documenta la función SQL.
 */
export async function updateEmployeePermissions(
  employeeId: number,
  permisos: PermissionSyncItem[],
): Promise<PermissionSyncResultRow[]> {
  const response = (await api.put(`/eval-col/funcionario/${employeeId}/permisos`, {
    permisos,
  })) as unknown as { rows: PermissionSyncResultRow[] } | PermissionSyncResultRow[]
  return unwrapRows<PermissionSyncResultRow>(response)
}
