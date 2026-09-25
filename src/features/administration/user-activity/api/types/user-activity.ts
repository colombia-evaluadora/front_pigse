/**
 * `estado` lo deriva el backend a partir de `academico_test.tsesion_web`
 * (V495/V500, `POST /pigse/usuarios/actividad/query`): `CON_INGRESO` = el
 * usuario tiene al menos una sesión registrada, `SIN_INGRESO` = nunca inició
 * sesión. No distingue "en línea ahora" — V500 sacó `EN_LINEA`/
 * `DESCONECTADO` del contrato real (la ventana de 30 min resultó no ser lo
 * que pedía el negocio); ver `pigse.fn_usuarios_actividad_listar_interno`.
 */
export const USER_ACTIVITY_STATUSES = ["CON_INGRESO", "SIN_INGRESO"] as const
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
  estado: UserActivityStatus
}
