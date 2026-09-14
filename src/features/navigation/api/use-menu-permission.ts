import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { unwrapRow } from "@/lib/response-envelope"

export interface MenuActionPermissions {
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  puedeVer: boolean
  isLoading: boolean
}

interface RealMenuPermissionRow {
  puedeCrear: boolean
  puedeEditar: boolean
  puedeEliminar: boolean
  puedeVer: boolean
}

const MOCK_PERMISSIONS: MenuActionPermissions = {
  puedeCrear: true,
  puedeEditar: true,
  puedeEliminar: true,
  puedeVer: true,
  isLoading: false,
}

/**
 * `GET /permisos-menu/:codigo` -> `pigse.fn_usuario_puede_en_menu` (V370/
 * V373): capacidades CREAR/EDITAR/ELIMINAR/VER del usuario logueado sobre
 * un menú (por `public.route.codigo`, no el `path`/nombre visible). Ya no
 * es un stub -- el motor de autorización de PIGSE (capability por menú vía
 * `public.role_route`) reemplaza al "todo habilitado" que se usaba
 * mientras ese catálogo no existía.
 */
async function fetchMenuPermission(codigo: string): Promise<MenuActionPermissions> {
  if (env.ENABLE_API_MOCKING) {
    return MOCK_PERMISSIONS
  }

  const row = unwrapRow<RealMenuPermissionRow>(
    (await api.get(`/pigse/permisos-menu/${codigo}`)) as unknown as
      | { rows: RealMenuPermissionRow[] }
      | RealMenuPermissionRow,
  )
  return { ...row, isLoading: false }
}

export function useMenuPermission(codigo: string): MenuActionPermissions {
  const { data, isLoading } = useQuery({
    queryKey: ["menu-permission", codigo],
    queryFn: () => fetchMenuPermission(codigo),
  })

  if (!data) {
    return { puedeCrear: false, puedeEditar: false, puedeEliminar: false, puedeVer: false, isLoading }
  }

  return { ...data, isLoading }
}
