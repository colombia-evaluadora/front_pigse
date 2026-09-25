import type { UserActivityStatus } from "@/features/administration/user-activity/api/types/user-activity"

type BadgeColor = "primary" | "secondary" | "muted" | "neutral" | "destructive" | "info" | "warning" | "success"
interface BadgeProps {
  variant: "soft"
  color: BadgeColor
}

export const USER_ACTIVITY_STATUS_LABELS: Record<UserActivityStatus, string> = {
  CON_INGRESO: "Con ingreso",
  SIN_INGRESO: "Sin ingreso",
}

export const USER_ACTIVITY_STATUS_BADGE: Record<UserActivityStatus, BadgeProps> = {
  CON_INGRESO: { variant: "soft", color: "success" },
  SIN_INGRESO: { variant: "soft", color: "muted" },
}
