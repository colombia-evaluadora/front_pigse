import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import {
  getFirstNavUrl,
  useNavItemsQuery,
} from "@/features/navigation/api/query/use-nav-items-query"

/**
 * Pantalla "Sin acceso" (`/app/sin-acceso?desde=`). Llega acá:
 *
 * - el guard de rutas (`menuGuardRoute` en `router.tsx`) cuando la URL no
 *   está en el menú del usuario (`canAccessPath`), y
 * - el redirect de `/app` cuando el usuario no tiene ningún menú (usuario
 *   del SSO sin rol de PIGSE, o roles sin menús asignados).
 *
 * Cuelga directo del layout protegido (no del guard), así que el sidebar se
 * sigue pintando y la propia pantalla nunca puede rebotar a sí misma.
 *
 * "Ir al inicio" lleva al primer ítem del menú (el mismo destino que `/app`).
 * Sin menú no hay inicio al que ir: el botón no se muestra en vez de mandar a
 * `/app`, que volvería acá.
 */
export function UnauthorizedPage() {
  const { data: items } = useNavItemsQuery()
  const home = items ? getFirstNavUrl(items) : null

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <h1 className="font-heading text-2xl font-bold">No tienes acceso a este módulo</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Tu rol no tiene permiso para ver esta sección. Si crees que es un error, contacta al
        administrador.
      </p>
      {home && (
        <Button size="sm" render={<Link to={home} />} nativeButton={false} className="mt-2">
          Ir al inicio
        </Button>
      )}
    </div>
  )
}
