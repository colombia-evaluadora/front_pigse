export type Role = "ADMIN" | "USER"

export interface User {
  id: string
  email: string
  name: string
  role: Role
  /**
   * Claims `roles` crudos del token (ej. `"CEVAL-SUPER_ADMINISTRADOR"`,
   * `"CEVAL-JEFE_DE_AREA"`). `role` arriba es la simplificación binaria
   * ADMIN/USER que ya consume `Authorization`; esto es lo que hace falta
   * para chequeos finos como "¿es super admin?" (ver `auth-mapper.ts`).
   */
  roles: string[]
}

export interface AuthResponse {
  token: string
  refreshToken: string
  expiresIn: number
}
