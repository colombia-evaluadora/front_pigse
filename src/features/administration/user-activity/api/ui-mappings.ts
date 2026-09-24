import type { UserActivityStatus } from "@/features/administration/user-activity/api/types/user-activity"

type BadgeColor = "primary" | "secondary" | "muted" | "neutral" | "destructive" | "info" | "warning" | "success"
interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export const USER_ACTIVITY_STATUS_LABELS: Record<UserActivityStatus, string> = {
  EN_LINEA: "En línea",
  DESCONECTADO: "Desconectado",
  SIN_INGRESO: "Sin ingreso",
}

export const USER_ACTIVITY_STATUS_BADGE: Record<UserActivityStatus, BadgeProps> = {
  EN_LINEA: { variant: "soft", color: "success" },
  DESCONECTADO: { variant: "soft", color: "secondary" },
  SIN_INGRESO: { variant: "soft", color: "muted" },
}
