/**
 * Excepción puntual de UN establecimiento a la fecha límite global (V522):
 * mientras esté activa, reemplaza (no suma) la global para ese
 * establecimiento — si no la tiene, se rige por la global.
 */
export interface DocumentDeadlineException {
  establecimientoId: number
  establecimientoNombre: string
  fechaLimite: string
}

/**
 * Fecha límite global de "Gestión documental" (V522, `GET /documentos/
 * fecha-limite`): después de esa fecha, ningún establecimiento puede
 * subir NI eliminar documentos — salvo el que tenga su propia excepción
 * (ver `excepciones`). `fechaLimite: null` = sin fecha límite configurada,
 * nadie está bloqueado.
 */
export interface DocumentDeadline {
  fechaLimite: string | null
  excepciones: DocumentDeadlineException[]
}
