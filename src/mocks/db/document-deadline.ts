import type {
  DocumentDeadline,
  DocumentDeadlineException,
} from "@/features/document-management/api/types/document-deadline"

/** Estado en memoria (V522): una fila global + N excepciones activas por
 *  establecimiento. Arranca sin fecha límite configurada. */
const state: DocumentDeadline = {
  fechaLimite: null,
  excepciones: [],
}

export function getDocumentDeadline(): DocumentDeadline {
  return { fechaLimite: state.fechaLimite, excepciones: [...state.excepciones] }
}

export function setDocumentDeadline(fechaLimite: string | null): { fechaLimite: string | null } {
  state.fechaLimite = fechaLimite
  return { fechaLimite: state.fechaLimite }
}

export function saveDocumentDeadlineException(
  establecimientoId: number,
  establecimientoNombre: string,
  fechaLimite: string,
): DocumentDeadlineException {
  const existing = state.excepciones.find((e) => e.establecimientoId === establecimientoId)
  if (existing) {
    existing.fechaLimite = fechaLimite
    return existing
  }
  const next: DocumentDeadlineException = { establecimientoId, establecimientoNombre, fechaLimite }
  state.excepciones.push(next)
  return next
}

export function deleteDocumentDeadlineException(establecimientoId: number): boolean {
  const index = state.excepciones.findIndex((e) => e.establecimientoId === establecimientoId)
  if (index < 0) return false
  state.excepciones.splice(index, 1)
  return true
}
