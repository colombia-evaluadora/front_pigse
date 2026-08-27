import type { ErrorComponentProps } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"

export function ErrorPage({ error, reset }: ErrorComponentProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
      <h1 className="text-2xl font-semibold">Algo salió mal</h1>
      <p className="text-muted-foreground">{error.message}</p>
      <Button size="sm" onClick={reset} className="mt-2">
        Reintentar
      </Button>
    </div>
  )
}
