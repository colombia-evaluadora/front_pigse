import type { ColumnDef } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"

import { DataTableColumnHeader } from "@/components/data-table"
import { Button } from "@/components/ui/button"
import { FolderOpenIcon } from "@/components/ui/icons"
import { paths } from "@/config/paths"

import type { Document } from "@/features/document-management/api/types/document"

import { isDocumentActionable } from "@/features/document-management/api/ui-mappings"
import { StatusIndicator } from "@/features/document-management/components/table/status-indicator"
import { DocumentDetailPopover } from "@/features/document-management/components/dialogs/popover-document-detail"
import { UploadDocumentDialog } from "@/features/document-management/components/dialogs/dialog-upload-document"
import { DeleteDocumentDialog } from "@/features/document-management/components/dialogs/dialog-delete-document"

/** PEI/PEC ya no son un solo archivo (V512): tienen 5 anexos por categoría. */
function hasCategories(document: Document): boolean {
  return document.type === "PEI" || document.type === "PEC"
}

const institutionColumn: ColumnDef<Document> = {
  accessorKey: "establishmentName",
  id: "establishmentName",
  meta: { label: "Institución" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Institución" />,
  cell: ({ row }) => <span className="text-pretty">{row.original.establishmentName ?? ""}</span>,
  enableSorting: true,
}

const typeColumn: ColumnDef<Document> = {
  accessorKey: "typeName",
  id: "typeName",
  meta: { label: "Tipo de Documento" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Tipo de Documento" />,
  cell: ({ row }) => <span className="text-pretty font-medium">{row.original.typeName}</span>,
  enableSorting: false,
}

const statusColumn: ColumnDef<Document> = {
  accessorKey: "status",
  id: "status",
  meta: { label: "Estado de Entrega" },
  header: ({ column }) => <DataTableColumnHeader column={column} title="Estado de Entrega" />,
  cell: ({ row }) => {
    const document = row.original

    // PEI/PEC (V512): sin archivo propio, el badge va solo con el avance
    // "x/5" al lado — el popover de Consultar/Descargar no aplica más acá
    // (vive en la tabla de anexos, un archivo por categoría).
    if (hasCategories(document)) {
      return (
        <div className="flex items-center gap-2">
          <StatusIndicator status={document.status} />
          {document.status !== "NO_APLICA" && document.totalCategories != null ? (
            <span className="text-xs text-muted-foreground">
              {document.completedCategories ?? 0}/{document.totalCategories}
            </span>
          ) : null}
        </div>
      )
    }

    // El popover envuelve al indicador visual para que el click sobre el
    // badge abra la tarjeta con el archivo y los botones Consultar /
    // Descargar. La columna "Acción" sigue siendo la fuente de verdad
    // para subir/eliminar.
    return (
      <DocumentDetailPopover document={document}>
        <StatusIndicator status={document.status} />
      </DocumentDetailPopover>
    )
  },
  enableSorting: false,
}

/**
 * Columna "Acción" explícita, NO la columna `id: "actions"` del
 * `DataTable`: esa usa un overlay absoluto que arranca con
 * `opacity-0` y solo aparece al hacer hover sobre la fila (ver
 * `data-table.tsx`). Acá queremos que el botón esté SIEMPRE
 * visible — es la acción principal de la fila, no algo secundario
 * que se revela.
 *
 * `isReadOnly` (Rector, ver `table-documents.tsx`) esconde Subir/Eliminar
 * de PMI, pero NO "Ver anexos" de PEI/PEC — entrar a mirar los 5 anexos es
 * lectura, no escritura, así que un Rector sigue pudiendo verlos aunque no
 * pueda cargarlos. Por eso es una función y no un `ColumnDef` fijo: filtrar
 * la columna entera post-hoc (como antes) se llevaba puesta esa navegación.
 */
function buildActionColumn(isReadOnly: boolean): ColumnDef<Document> {
  return {
    id: "singleAction",
    accessorKey: "status",
    meta: { label: "Acción" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Acción" />,
    cell: ({ row }) => {
      const document = row.original

      // Un documento que el EE no debe entregar no ofrece acción: no se puede
      // "subir" algo que no aplica ni "eliminar" algo que nunca existió. La
      // celda queda vacía en vez de mostrar un botón que el backend rechazaría.
      if (!isDocumentActionable(document.status)) return null

      // PEI/PEC (V512): "subir"/"eliminar" ya no aplican a la fila del tipo —
      // el archivo vive en cada uno de sus 5 anexos. La acción es "entrar",
      // siempre disponible (lectura), incluso para un Rector de solo lectura.
      if (hasCategories(document)) {
        return (
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              color="neutral"
              size="sm"
              render={<Link to={paths.app.gestionDocumentalDetalle.getHref(document.type)} />}
              nativeButton={false}
            >
              <FolderOpenIcon data-icon="inline-start" />
              Ver anexos
            </Button>
          </div>
        )
      }

      if (isReadOnly) return null

      const isPending = document.status === "PENDIENTE"
      return (
        <div className="flex items-center justify-end">
          {isPending ? (
            <UploadDocumentDialog document={document} />
          ) : (
            <DeleteDocumentDialog document={document} />
          )}
        </div>
      )
    },
    enableSorting: false,
    enableHiding: false,
    size: 160,
  }
}

/** Vista de un solo EE (Rector/Secretario/Administrador sobre su propio
 * establecimiento): sin columna de institución (es siempre la misma).
 * `isReadOnly` (Rector) esconde Subir/Eliminar de PMI, ver `buildActionColumn`. */
export function buildOwnColumns(isReadOnly: boolean): ColumnDef<Document>[] {
  return [typeColumn, statusColumn, buildActionColumn(isReadOnly)]
}

/**
 * Vista de PIGSE-ADMINISTRADOR/PIGSE-SECRETARIA_TERRITORIAL sobre TODAS las
 * instituciones (V368): agrega la columna "Institución" al frente, y quita
 * "Acción" — es una vista de fiscalización, de solo lectura, no de carga
 * (mismo criterio que ya aplica al Rector en la vista de un solo EE).
 */
export const allInstitutionsColumns: ColumnDef<Document>[] = [
  institutionColumn,
  typeColumn,
  statusColumn,
]
