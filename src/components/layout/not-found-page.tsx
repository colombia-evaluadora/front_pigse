import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth/hooks/use-auth"

export function NotFoundPage() {
  const { isAuthenticated } = useAuth()

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <h1 className="text-2xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground">La URL a la que intentaste acceder no existe.</p>
      <Button
        size="sm"
        render={<Link to={isAuthenticated ? "/app" : "/"} />}
        nativeButton={false}
        className="mt-2"
      >
        Volver al inicio
      </Button>
    </div>
  )
}
