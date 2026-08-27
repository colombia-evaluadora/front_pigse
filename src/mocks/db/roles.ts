import type { Role } from "@/features/administration/roles-menus/api/types/role-menu"

/**
 * Catálogo de roles del mock. Los `name` son los MISMOS de `public.role.name`
 * en el SSO, y los `id` los mismos `id_role` — así la pantalla de
 * configuración de roles y menús trabaja contra el mismo contrato que en
 * producción.
 *
 * Alcance de cada uno (espejo de `public.role_query`):
 *  - ADMINISTRADOR          → todo.
 *  - RECTOR                 → "Gestión documental" en modo LECTURA.
 *  - SECRETARIO             → "Gestión documental" lectura + escritura.
 *  - SECRETARIA_TERRITORIAL → "Monitoreo y cumplimiento".
 *  - DIRECTOR_ENTE_TERRITORIAL / JEFE_AREA_* / JEFE_SISTEMA_ENTE_TERRITORIAL
 *                           → "Monitoreo y cumplimiento".
 *  - AUXILIAR_ADMINISTRATIVO / JEFE_SISTEMA_ESTABLECIMIENTO
 *                           → sin permisos propios todavía en la BD.
 */
export const rolesDb: Role[] = [
  { id: 840, name: "PIGSE-ADMINISTRADOR" },
  { id: 836, name: "PIGSE-RECTOR" },
  { id: 841, name: "PIGSE-SECRETARIO" },
  { id: 839, name: "PIGSE-SECRETARIA_TERRITORIAL" },
  { id: 832, name: "PIGSE-DIRECTOR_ENTE_TERRITORIAL" },
  { id: 834, name: "PIGSE-JEFE_AREA_CALIDAD" },
  { id: 838, name: "PIGSE-JEFE_AREA_COBERTURA" },
  { id: 831, name: "PIGSE-JEFE_AREA_PLANEACION" },
  { id: 835, name: "PIGSE-JEFE_SISTEMA_ENTE_TERRITORIAL" },
  { id: 833, name: "PIGSE-JEFE_SISTEMA_ESTABLECIMIENTO" },
  { id: 837, name: "PIGSE-AUXILIAR_ADMINISTRATIVO" },
]
