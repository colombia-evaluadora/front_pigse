type BadgeColor = "primary" | "secondary" | "destructive" | "info" | "warning" | "success"

interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export function establishmentStatusBadge(statusLabel: string): BadgeProps {
  const isActive = statusLabel.toLowerCase().startsWith("activ")
  return {
    variant: "soft",
    color: isActive ? "success" : "destructive",
  }
}

export function establishmentStatusDisplayLabel(statusLabel: string): string {
  return statusLabel === "Activo" ? "Activa" : statusLabel
}
