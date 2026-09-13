/**
 * PIGSE no expone el endpoint `permisos-menu` que usa CEVAL para resolver
 * permisos CRUD por menú — la granularidad se queda en el backend (si el rol
 * tiene `role_app` para PIGSE, ve la app y sus CRUDs; si no, no ve nada).
 *
 * Mientras no exista ese catálogo acá, este hook devuelve los cuatro
 * permisos habilitados. La UI lo consume solo para mostrar/ocultar los
 * botones de crear/editar/eliminar, así que este default hace que la página
 * de campuses funcione sin un 403 espurio en modo mock o real para
 * PIGSE-ADMINISTRADOR (que ya pasó el gate del sidebar).
 */
export interface MenuActionPermissions {
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  puedeVer: boolean
  isLoading: boolean
}

export function useMenuPermission(_codigo: string): MenuActionPermissions {
  return {
    puedeCrear: true,
    puedeEditar: true,
    puedeEliminar: true,
    puedeVer: true,
    isLoading: false,
  }
}
