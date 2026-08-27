"use no memo"

import { useMemo } from "react"

import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { DataTable } from "@/components/data-table"
import { useDataTable } from "@/hooks/use-data-table"
import { useUser } from "@/lib/auth"
import { canWriteDocuments } from "@/lib/auth-routes"

import { useDocumentsQuery } from "@/features/document-management/api/query/use-documents"
import { columns as baseColumns } from "@/features/document-management/components/table/columns-documents"

/**
 * Listado de documentos institucionales del EE: solo dos filas
 * (PEI y PMI), sin paginación, sin buscador, sin selección múltiple.
 * Cada fila expone su propio botón de "Subir / Reemplazar" y, cuando
 * hay archivo vigente, el de "Eliminar". El estado de entrega se pinta
 * con un punto de color + badge y, si está COMPLETO, abre un popover
 * con los datos del archivo y los botones "Consultar" / "Descargar".
 *
 * El Rector entra al mismo módulo pero en modo lectura: se oculta la
 * columna de acción ("Subir"/"Eliminar") y queda solo el punto de estado
 * + el popover de "Consultar". Los demás roles del catálogo
 * (Administrador, Secretario/a) conservan el flujo completo.
 *
 * No usa `useTablePagination` ni filtros: el catálogo es cerrado
 * (siempre dos filas) y la información a filtrar es trivial. Se monta
 * directo sobre `useDataTable` con `pageCount: 1` y sin paginación.
 */
export function DocumentManagementTable() {
  const { data: documents = [], isPending, isError, refetch } = useDocumentsQuery()

  // El backend resuelve el EE del token, así que todas las filas son del mismo
  // establecimiento: alcanza con leer el nombre de la primera que lo traiga.
  // Si no viene (el backend todavía no lo expone), el subtítulo se muestra sin
  // el nombre en vez de inventar uno.
  const establishmentName = documents.find((d) => d.establishmentName)?.establishmentName
  const userQuery = useUser()

  // La columna de acción (Subir / Eliminar) se pinta solo si el rol puede
  // escribir. En la BD, `POST /documentos/upload` y `PATCH /documentos/:TIPO`
  // aceptan ADMINISTRADOR y SECRETARIO; el RECTOR entra en modo lectura y
  // se queda con el punto de estado + el popover de Consultar.
  const isReadOnly = !canWriteDocuments(userQuery.data)
  const columns = useMemo(
    () => (isReadOnly ? baseColumns.filter((column) => column.id !== "singleAction") : baseColumns),
    [isReadOnly],
  )

  const { table } = useDataTable({
    columns,
    data: documents,
    pageCount: 1,
    pageIndex: 0,
    pageSize: documents.length || 10,
    // Sin paginación real: el catálogo es cerrado y siempre cabe en una
    // sola página. `useDataTable` requiere los setters igual.
    goToPage: () => {},
    setPageSize: () => {},
    sorting: [],
    setSorting: () => {},
    getRowId: (row) => row.id,
  })

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Cargue y consulte sus documentos institucionales">
          Gestión documental
        </TableScreenTitle>
        <div className="border-b border-border bg-muted/10 px-(--screen-spacing) py-3">
          <p className="m-0! text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {establishmentName ? `${establishmentName} · ` : ""}Detalle documentos
          </p>
        </div>
      </TableScreenHeader>

      <TableScreenBody>
        <DataTable
          table={table}
          isPending={isPending}
          isError={isError}
          onRetry={refetch}
          emptyMessage="No hay documentos institucionales configurados."
          errorMessage="Ocurrió un error al cargar los documentos institucionales."
        />
      </TableScreenBody>
    </TableScreen>
  )
}
