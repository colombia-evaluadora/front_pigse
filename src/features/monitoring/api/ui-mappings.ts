import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns"
import { es } from "date-fns/locale"

import type {
  ComplianceDocumentState,
  ComplianceEstado,
  ComplianceRow,
  CompliancePlazo,
  DocumentType,
} from "@/features/monitoring/api/types/compliance"

type BadgeColor = "success" | "warning" | "destructive" | "muted" | "info" | "orange" | "neutral"

/**
 * `estado` derivado del jsonb (V523). Con un backend anterior no viene y se
 * reconstruye igual que en el SQL: PENDIENTE con algún anexo cargado es
 * PARCIAL, sin ninguno es SIN_CARGAR.
 */
export function resolveEstado(state: ComplianceDocumentState): ComplianceEstado {
  if (state.estado) return state.estado
  if (state.status === "COMPLETO" || state.status === "NO_APLICA") return state.status
  return (state.completedCategories ?? 0) > 0 ? "PARCIAL" : "SIN_CARGAR"
}

export interface StatusBadgeConfig {
  label: string
  color: BadgeColor
  /** Texto completo para lectores de pantalla y `title`. */
  description: string
}

/**
 * Etiqueta del estado de un documento. Si el plazo ya venció y el documento
 * no está completo, "Vencido" gana sobre Parcial/Sin cargar: es lo que el
 * monitor tiene que perseguir primero.
 */
export function documentStatusBadge(
  state: ComplianceDocumentState,
  plazo?: CompliancePlazo | null,
): StatusBadgeConfig {
  const estado = resolveEstado(state)
  const done = state.completedCategories ?? 0
  const total = state.totalCategories ?? 0
  const ratio = total > 0 ? `${done}/${total}` : ""
  const anexos = total > 0 ? ` (${done} de ${total} anexos obligatorios)` : ""

  if (estado === "NO_APLICA") {
    return { label: "No aplica", color: "muted", description: "No aplica a este establecimiento" }
  }
  if (estado === "COMPLETO") {
    return { label: "Completo", color: "success", description: `Completo${anexos}` }
  }
  if (plazo === "VENCIDO") {
    return {
      label: ratio ? `Vencido ${ratio}` : "Vencido",
      color: "destructive",
      description: `Plazo vencido sin completar${anexos}`,
    }
  }
  if (estado === "PARCIAL") {
    return { label: `Parcial ${ratio}`.trim(), color: "warning", description: `Parcial${anexos}` }
  }
  return {
    label: ratio ? `Pendiente ${ratio}` : "Pendiente",
    color: "orange",
    description: `Pendiente: no ha cargado anexos${anexos}`,
  }
}

/** Badge del plazo de la fila (columna "Fecha límite"). */
export function plazoBadge(row: Pick<ComplianceRow, "plazo" | "tieneExcepcion" | "globalProgress">):
  | StatusBadgeConfig
  | null {
  if (row.plazo === "VENCIDO" && row.globalProgress < 100) {
    return { label: "Vencido", color: "destructive", description: "La fecha límite pasó y faltan documentos" }
  }
  if (row.tieneExcepcion) {
    return { label: "Con prórroga", color: "info", description: "Tiene fecha límite propia (excepción)" }
  }
  if (row.plazo === "VENCIDO") {
    return { label: "Cerrado", color: "muted", description: "La fecha límite pasó; entregó todo" }
  }
  if (row.plazo === "VIGENTE") {
    return { label: "Vigente", color: "success", description: "Dentro del plazo" }
  }
  return null
}

/** Etiquetas de los filtros (las comparte el buscador y los chips). */
export const ESTADO_FILTER_OPTIONS = [
  { value: "COMPLETO", label: "Completo" },
  { value: "PARCIAL", label: "Parcial" },
  { value: "SIN_CARGAR", label: "Sin cargar" },
  { value: "PENDIENTE", label: "Pendiente (parcial o sin cargar)" },
  { value: "NO_APLICA", label: "No aplica" },
]

export const PLAZO_FILTER_OPTIONS = [
  { value: "VENCIDO", label: "Vencido sin completar" },
  { value: "PRORROGA", label: "Con prórroga" },
  { value: "VIGENTE", label: "Vigente" },
  { value: "SIN_FECHA", label: "Sin fecha límite" },
]

export const ETNIAS_FILTER_OPTIONS = [
  { value: "N", label: "Regular (PEI · PMI)" },
  { value: "S", label: "Etnoeducativo (PEC · PFI)" },
]

/** Los dos tipos que aplican a un EE (excluyentes por ETNIAS). */
export function applicableTypes(etnoeducativo: boolean | null | undefined): DocumentType[] {
  return etnoeducativo ? ["PEC", "PFI"] : ["PEI", "PMI"]
}

export function shortTypeName(type: DocumentType): string {
  switch (type) {
    case "PEI":
      return "Proyecto Educativo Institucional"
    case "PEC":
      return "Proyecto Educativo Comunitario"
    case "PMI":
      return "Plan de Mejoramiento Institucional"
    case "PFI":
      return "Plan de Fortalecimiento Institucional"
  }
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = parseISO(value)
  return isValid(date) ? date : null
}

/** "12 mar 2026". */
export function formatShortDate(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, "d MMM yyyy", { locale: es }) : ""
}

/** "12 mar 2026, 3:45 p. m." */
export function formatDateTime(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? format(date, "d MMM yyyy, h:mm a", { locale: es }) : ""
}

/** "hace 3 días". */
export function formatRelative(value: string | null | undefined): string {
  const date = toDate(value)
  return date ? `hace ${formatDistanceToNowStrict(date, { locale: es })}` : ""
}
