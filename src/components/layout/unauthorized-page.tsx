import { Link, useSearch } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

import { unauthorizedSearchSchema } from "@/components/layout/unauthorized-search"
import { unauthorizedRoute } from "@/router"

/**
 * Pantalla que se muestra cuando el usuario autenticado intenta entrar a
 * una ruta que no está en su menú. La dispara `appLayoutRoute.beforeLoad`
 * en `router.tsx` cuando `canAccessPath` rechaza la URL.
 *
 * Los query params llegan desde el redirect (`from` = URL original,
 * `home` = primera ruta permitida). El botón "Ir a mi inicio" usa el
 * `home` que vino en el redirect; si por alguna razón falta, igual va
 * al inicio del layout (`/app`), donde `appIndexRoute.beforeLoad` lo
 * redirige a su primera ruta permitida.
 *
 * El `useSearch({ from: unauthorizedRoute.id })` cierra una dependencia
 * circular con `router.tsx` (que define la ruta). ES modules lo manejan
 * sin problema: al render-time de este componente, `unauthorizedRoute`
 * ya está definido.
 */
export function UnauthorizedPage() {
  const search = useSearch({ from: unauthorizedRoute.id })
  const parsed = unauthorizedSearchSchema.parse(search)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <h1 className="font-heading text-2xl font-bold">No autorizado</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {parsed.from
          ? `Su rol no tiene acceso a "${parsed.from}". Si cree que se trata de un error, contacte al administrador.`
          : "Su rol no tiene acceso a esta sección. Si cree que se trata de un error, contacte al administrador."}
      </p>
      <Button
        size="sm"
        render={<Link to={parsed.home ?? "/app"} />}
        nativeButton={false}
        className="mt-2"
      >
        Ir a mi inicio
      </Button>
    </div>
  )
}
