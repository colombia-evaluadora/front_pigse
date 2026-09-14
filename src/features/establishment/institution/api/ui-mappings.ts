type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"

interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export function establishmentStatusBadge(statusLabel: string | null | undefined): BadgeProps {
  // `fk_tlv_estado_establecimiento` es nullable en pigse.TESTABLECIMIENTO
  // (V387) -- un establecimiento sin estado asignado todavía manda
  // `estado_nombre: null`. Antes esto reventaba con
  // "Cannot read properties of undefined (reading 'toLowerCase')" y
  // tumbaba TODA la pantalla, no solo esa celda.
  const isActive = (statusLabel ?? "").toLowerCase().startsWith("activ")
  return {
    variant: "soft",
    color: isActive ? "success" : "destructive",
  }
}

export function establishmentStatusDisplayLabel(statusLabel: string | null | undefined): string {
  if (!statusLabel) return "Sin estado"
  return statusLabel === "Activo" ? "Activa" : statusLabel
}
