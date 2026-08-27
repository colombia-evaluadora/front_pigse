import { EMPLOYEE_STATUSES } from "@/features/establishment/employees/api/types/employee"
import type { PermissionStatus } from "@/features/establishment/institution/api/types/permission"

type BadgeColor = "success" | "destructive"

interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export const EMPLOYEE_STATUS_LABELS: Record<PermissionStatus, string> = {
  ACTIVE: "Activo",
  SUSPENDED: "Suspendido",
}

/**
 * `TUSUARIO.ESTADO` ('A'/'I', mapeado acá a "ACTIVE"/"SUSPENDED") es un
 * dominio fijo de la tabla, no un catálogo real — no tiene fila en
 * `TLISTA_VALOR`, así que el filtro de estado en la tabla de funcionarios
 * no debe salir de una consulta a catálogo (antes reusaba
 * `CATALOGS.ENTITY_STATUSES`, que en realidad apunta a
 * `ESTADO_ESTABLECIMIENTO` — otro dominio, coincidencia de mock). Son estas
 * dos opciones fijas, siempre.
 */
export const EMPLOYEE_STATUS_OPTIONS = EMPLOYEE_STATUSES.map((status) => ({
  code: status,
  name: EMPLOYEE_STATUS_LABELS[status],
}))

export const EMPLOYEE_STATUS_BADGE: Record<PermissionStatus, BadgeProps> = {
  ACTIVE: {
    variant: "soft",
    color: "success",
  },
  SUSPENDED: {
    variant: "soft",
    color: "destructive",
  },
}
