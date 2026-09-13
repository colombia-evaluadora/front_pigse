import type { RouteResponseDto } from "@/features/navigation/api/types/nav-item"

/**
 * Espejo de `public.route` + `role_route` filtrado por `app.name = 'PIGSE'`.
 *
 * Los `id` son los `id_route` reales y los `roleIds` los `id_role` reales
 * (ver `mocks/db/roles.ts`), así el mock reproduce exactamente lo que
 * devuelve `fn_list_my_menus` en el servidor.
 *
 * Los `path` van CON el prefijo `/app` aunque el backend los guarde sin él:
 * `use-nav-items-query.ts` normaliza el dato real antes de mapearlo, y esa
 * normalización es idempotente.
 *
 * Consulta que genera esta tabla:
 * ```sql
 * SELECT r.id_route, r.name, r.path, r.icon, r.menuorder, r.idparent,
 *        string_agg(ro.name, ', ' ORDER BY ro.name) AS roles
 *   FROM route r
 *   JOIN app_route ar ON ar.id_route = r.id_route
 *   JOIN app a        ON a.id_app    = ar.id_app
 *   LEFT JOIN role_route rr ON rr.route_id = r.id_route
 *   LEFT JOIN role ro       ON ro.id_role  = rr.role_id
 *  WHERE a.name = 'PIGSE'
 *  GROUP BY r.id_route, r.name, r.path, r.icon, r.menuorder, r.idparent;
 * ```
 */
export interface MockMenu extends RouteResponseDto {
  visible?: boolean
  planId?: number | null
}

export const navigationMenu: MockMenu[] = [
  {
    id: 51,
    name: "Gestión Documental",
    icon: "folder",
    path: "/app/gestion-documental",
    menuOrder: 1,
    type: "ITEM",
    idParent: null,
    // PIGSE-ADMINISTRADOR, PIGSE-RECTOR, PIGSE-SECRETARIO
    roleIds: [840, 836, 841],
  },
  {
    id: 52,
    name: "Monitoreo y Cumplimiento",
    icon: "chart",
    path: "/app/monitoreo-cumplimiento",
    menuOrder: 2,
    type: "ITEM",
    idParent: null,
    // PIGSE-ADMINISTRADOR, PIGSE-SECRETARIA_TERRITORIAL,
    // PIGSE-DIRECTOR_ENTE_TERRITORIAL, PIGSE-JEFE_AREA_CALIDAD,
    // PIGSE-JEFE_AREA_COBERTURA, PIGSE-JEFE_AREA_PLANEACION,
    // PIGSE-JEFE_SISTEMA_ENTE_TERRITORIAL
    roleIds: [840, 839, 832, 834, 838, 831, 835],
  },
  {
    id: 100,
    name: "Administración",
    icon: "Admin-Panel-Settings-Icon",
    path: "/app/registro-de-actividad/sesiones",
    menuOrder: 3,
    type: "GROUP",
    idParent: null,
    // PIGSE-ADMINISTRADOR, PIGSE-SECRETARIA_TERRITORIAL
    roleIds: [840, 839],
  },
  {
    id: 101,
    name: "Registro de actividad",
    icon: "",
    path: "/app/registro-de-actividad/sesiones",
    menuOrder: 0,
    type: "ITEM",
    idParent: 100,
    roleIds: [840, 839],
  },
  {
    id: 102,
    name: "Configuración de roles y menús",
    icon: "",
    path: "/app/administracion/roles-menus",
    menuOrder: 1,
    type: "ITEM",
    idParent: 100,
    // PIGSE-ADMINISTRADOR (la secretaría territorial no edita el catálogo)
    roleIds: [840],
    maxLines: 2,
  },
  {
    id: 103,
    name: "Establecimiento Educativo",
    icon: "Bank-Icon",
    path: "/app/establecimiento-educativo",
    menuOrder: 4,
    type: "GROUP",
    idParent: null,
    // PIGSE-ADMINISTRADOR, PIGSE-RECTOR
    roleIds: [840, 836],
    maxLines: 2,
  },
  {
    id: 104,
    name: "Establecimiento",
    icon: "",
    path: "/app/establecimiento-educativo/general",
    menuOrder: 0,
    type: "ITEM",
    idParent: 103,
    roleIds: [840, 836],
  },
  {
    id: 105,
    name: "Sedes Educativas",
    icon: "",
    path: "/app/establecimiento-educativo/sedes",
    menuOrder: 1,
    type: "ITEM",
    idParent: 103,
    roleIds: [840, 836],
  },
  {
    id: 106,
    name: "Funcionarios",
    icon: "",
    path: "/app/establecimiento-educativo/funcionarios",
    menuOrder: 2,
    type: "ITEM",
    idParent: 103,
    roleIds: [840, 836],
  },
]
