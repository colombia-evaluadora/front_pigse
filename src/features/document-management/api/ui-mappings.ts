import type { DocumentStatus } from "@/features/document-management/api/types/document"

type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"

interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

/**
 * Color del badge según el estado del documento.
 *
 * - COMPLETO  → verde (success). Coincide con el punto verde del Figma y con
 *   la convención que ya usa la pantalla de establecimientos para "Activa".
 * - PENDIENTE → rojo (destructive): es algo que el EE todavía no entregó.
 * - NO_APLICA → gris (secondary). NO es un problema ni una deuda: el EE no
 *   tiene que entregar ese documento por su modalidad, así que pintarlo en
 *   rojo mentiría sobre su cumplimiento.
 *
 * El `switch` es exhaustivo a propósito: si mañana la función del backend
 * agrega un cuarto estado, TypeScript rompe acá en vez de caer silenciosamente
 * en el color de "pendiente".
 */
export function documentStatusBadge(status: DocumentStatus): BadgeProps {
  switch (status) {
    case "COMPLETO":
      return { variant: "soft", color: "success" }
    case "PENDIENTE":
      return { variant: "soft", color: "destructive" }
    case "NO_APLICA":
      return { variant: "soft", color: "secondary" }
  }
}

/** Etiqueta legible del estado para el badge. */
export function documentStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case "COMPLETO":
      return "Completo"
    case "PENDIENTE":
      return "Pendiente"
    case "NO_APLICA":
      return "No aplica"
  }
}

/**
 * ¿Este documento admite acciones de carga/baja?
 *
 * Solo los aplicables. Un `NO_APLICA` no ofrece "Subir" porque el EE no debe
 * entregarlo — es la misma regla que aplica el backend, que ni siquiera crea
 * la fila en `tdocumento_institucional` para esos casos.
 */
export function isDocumentActionable(status: DocumentStatus): boolean {
  return status !== "NO_APLICA"
}
