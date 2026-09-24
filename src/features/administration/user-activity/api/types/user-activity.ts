/**
 * `estado` lo deriva el backend a partir de `academico_test.tsesion_web`
 * (V495, `POST /pigse/usuarios/actividad/query`): `EN_LINEA` = sesión abierta
 * con actividad en los últimos 30 min (misma regla que `/audits/query`),
 * `DESCONECTADO` = tuvo sesión alguna vez, `SIN_INGRESO` = nunca inició
 * sesión. Las sesiones se recolectan a los 40 días de cerradas, así que un
 * usuario inactivo por más tiempo vuelve a `SIN_INGRESO`.
 */
export const USER_ACTIVITY_STATUSES = ["EN_LINEA", "DESCONECTADO", "SIN_INGRESO"] as const
export type UserActivityStatus = (typeof USER_ACTIVITY_STATUSES)[number]

/** Una fila por (establecimiento, usuario PIGSE activo). */
export interface UserActivityRow {
  /** `null` en usuarios territoriales sin EE asociado. */
  establecimientoId: number | null
  establecimientoCodigo: string | null
  establecimientoNombre: string | null
  usuarioId: number
  nombre: string
  identificacion: string
  correo: string
  /** CSV de roles PIGSE del usuario (`rectores y secretarios`, típicamente). */
  roles: string
  ultimoLogin: string | null
  ultimaActividad: string | null
  enLinea: boolean
  estado: UserActivityStatus
}
