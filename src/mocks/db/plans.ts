import type { Plan } from "@/features/administration/roles-menus/api/types/role-menu"

/** Planes a los que se puede atar un menú (qué producto lo incluye). */
export const plansDb: Plan[] = [
  { id: 1, name: "Preescolar" },
  { id: 2, name: "Básico" },
  { id: 3, name: "Medio" },
]
