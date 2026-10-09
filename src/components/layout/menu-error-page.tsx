import { useEffect, useState } from "react"
import { useRouter, type ErrorComponentProps } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/api-client"
import { useNavItemsQuery } from "@/features/navigation/api/query/use-nav-items-query"

/**
 * Error del guard de rutas (`menuGuardRoute`) y del redirect de `/app`
 * cuando el menú del usuario no se pudo cargar (red caída, 5xx…) y no había
 * uno en cache. Sin menú no se puede decidir el acceso, así que:
 *
 * - NO se concede: la página pedida nunca se monta.
 * - NO se cierra la sesión: la sesión es válida (un 401 ya lo maneja el
 *   interceptor de `api-client`), lo que falló es otra cosa.
 * - NO es "Sin acceso": decirle a alguien que no tiene permiso por un corte
 *   de red lo mandaría a molestar al administrador por nada.
 *
 * Se pinta dentro del layout protegido (las dos rutas cuelgan de él), así que
 * el sidebar queda visible — con su propio "Reintentar" si también falló.
 *
 * "Reintentar" hace `router.invalidate()`, que vuelve a correr los
 * `beforeLoad` (y con ellos la carga del menú). El `reset` de
 * `ErrorComponentProps` no sirve acá: para errores de `beforeLoad` el router
 * lo pasa `undefined`.
 */
export function MenuErrorPage({ error }: ErrorComponentProps) {
  const router = useRouter()
  const [isRetrying, setIsRetrying] = useState(false)
  const { data: items } = useNavItemsQuery()

  // El menú puede llegar por otro lado: el "Reintentar" del sidebar o su
  // refetch automático al montar (comparten la entrada del cache). Apenas
  // hay menú se re-evalúa el guard; no hay bucle posible porque, con menú en
  // cache, `fetchNavItemsForAccess` ya no tira (decide con ese).
  useEffect(() => {
    if (items) void router.invalidate()
  }, [items, router])

  async function retry() {
    setIsRetrying(true)
    try {
      await router.invalidate()
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <h1 className="font-heading text-2xl font-bold">No pudimos cargar tu menú</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Sin el menú no podemos confirmar a qué módulos tienes acceso. Intenta de nuevo en un
        momento.
      </p>
      <p className="max-w-md text-xs text-muted-foreground">{getErrorMessage(error)}</p>
      <Button size="sm" onClick={retry} disabled={isRetrying} className="mt-2">
        {isRetrying ? "Reintentando…" : "Reintentar"}
      </Button>
    </div>
  )
}
