/**
 * Último search del tablero de Monitoreo (filtros, orden y página), para que
 * "Volver" del detalle documental lleve SIEMPRE al tablero —no un paso atrás
 * en el historial, que después de cambiar de pestaña o abrir el visor caía en
 * otra pantalla— y aun así lo deje como estaba.
 *
 * sessionStorage: es solo una comodidad de navegación de esta pestaña. Puede
 * no estar disponible (modo privado, almacenamiento bloqueado): en ese caso se
 * vuelve al tablero sin filtros.
 */
const KEY = "pigse-monitoreo-ultimo-filtro"

export function guardarUltimoFiltroTablero(search: Record<string, unknown>) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(search))
  } catch {
    // Sin almacenamiento: "Volver" irá al tablero limpio.
  }
}

export function leerUltimoFiltroTablero(): Record<string, unknown> {
  try {
    const raw = sessionStorage.getItem(KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}
