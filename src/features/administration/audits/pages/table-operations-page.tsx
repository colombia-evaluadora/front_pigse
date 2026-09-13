import { XIcon } from "@/components/ui/icons"
import { Link } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { paths } from "@/config/paths"
import { TableOperationsDataTable } from "@/features/administration/audits/components/table/table-operations-table"

export function TableOperationsPage() {
  return (
    // El encabezado sticky y el cuerpo son dos Cards independientes (cada
    // una con su propio `ring-1`), NO se encapsulan en una misma Card aquí
    // — eso lo hace internamente `TableOperationsDataTable` para que el
    // cuerpo y su contenido data-driven compartan el ciclo de vida.
    <TableOperationsDataTable
      title="Detalle"
      action={
        <Button
          variant="fill"
          color="neutral"
          size="sm"
          render={<Link to={paths.app.auditoriaTablas.getHref()} />}
          nativeButton={false}
        >
          <XIcon data-icon="inline-start" />
          Cerrar
        </Button>
      }
    />
  )
}
