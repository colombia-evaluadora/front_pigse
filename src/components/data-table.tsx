"use no memo"

import { Fragment, type ReactNode } from "react"
import { flexRender, type Column, type Row, type RowData, type Table } from "@tanstack/react-table"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CaretUpDownIcon,
  EyeSlashIcon,
  GearIcon,
} from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data/table"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlay/dropdown-menu"
import { cn } from "@/lib/utils"

declare module "@tanstack/react-table" {
  // El `header` de cada columna es JSX, así que no sirve como etiqueta
  // legible fuera de la tabla (menú de columnas visibles, exports, etc.).
  // `meta.label` guarda ese texto en español una sola vez.
  interface ColumnMeta<TData extends RowData, TValue> {
    label?: string
  }
}

/** Piezas que `DataTable` presta al `footerRow` para que encaje con la grilla. */
interface FooterRowParts {
  /** La celda de respiro previa a `actions`. Va justo antes de la de acciones. */
  spacer: ReactNode
  /** Clases de la celda `actions` (sticky + ancho mínimo). */
  actionsCellClassName: string
  /**
   * Clases del bloque de acciones. Va siempre visible: el botón de agregar es
   * el sentido de la fila, no una acción secundaria que se revele al hover.
   */
  actionsOverlayClassName: string
}

interface DataTableProps {
  table: Table<any>
  isPending: boolean
  isError: boolean
  onRetry: () => void
  emptyMessage?: string
  errorMessage?: string
  /**
   * Fila expandible bajo cada fila: se renderiza en un `<tr>` propio a todo el
   * ancho. Devolver `null` para las filas cerradas.
   */
  renderSubRow?: (row: Row<any>) => ReactNode
  /**
   * Filas que muestran sus acciones siempre, sin esperar el hover. Es para las
   * filas en edición: ahí los botones de guardar/cancelar son el control
   * principal y no pueden depender de que el puntero esté encima.
   */
  isRowActive?: (row: Row<any>) => boolean
  /**
   * Fila fija al pie del cuerpo (alta en línea). Recibe las piezas de la
   * grilla porque tiene que replicar la celda de respiro y la de acciones.
   */
  footerRow?: (parts: FooterRowParts) => ReactNode
  cellClassName?: string
  /**
   * Id de la columna que absorbe el espacio sobrante (`width: 100%`). Sirve
   * para empaquetar a la izquierda las columnas angostas (expandir,
   * seleccionar) en tablas con pocas columnas, donde el ancho se reparte y
   * agranda la separación entre celdas.
   */
  growColumnId?: string
  /** Clases extra para `growColumnId`, a nivel de th/td. */
  growColumnClassName?: string
  insideSubRow?: boolean
}

export function DataTable({
  table,
  isPending,
  isError,
  onRetry,
  emptyMessage = "Sin resultados.",
  errorMessage = "Ocurrió un error al cargar los datos.",
  renderSubRow,
  isRowActive,
  footerRow,
  cellClassName,
  growColumnId,
  growColumnClassName,
  insideSubRow = false,
}: DataTableProps) {
  const visibleColumns = table.getAllColumns().filter((c) => c.getIsVisible())
  const skeletonRowCount = table.getState().pagination.pageSize

  // Los botones de fila son un overlay ABSOLUTO sobre la celda `actions`, no
  // contenido en flujo: así no empujan el layout y solo se revelan al hacer
  // hover (o foco) sobre la fila.
  //
  // La celda ancla ese overlay y va pegada al borde derecho del contenedor de
  // scroll (`sticky right-0`), para que los botones sigan alcanzables con la
  // tabla scrolleada en horizontal. La celda NO lleva fondo —así las columnas
  // que pasan por debajo se ven normal—; lo único opaco es el overlay.
  // `w-px`: con `table-layout: auto` el sobrante de ancho se reparte entre las
  // columnas, y esta se llevaba una tajada grande pese a no tener contenido en
  // flujo (los botones son absolutos, su min-content es 0). Pedir 1px la deja
  // en el mínimo y el sobrante se va a las columnas con texto.
  const isActionsColumn = (id: string) => id === "actions"
  const actionsCellClass = "sticky right-0 z-10 w-px"
  // `inset-y-0 right-0` y sin radio: el bloque va a sangre contra el borde de
  // la tabla, con el alto completo de la fila.
  //
  // El fondo es el MISMO color del hover de `TableRow` (`bg-muted/50`) pero ya
  // resuelto sobre la card: acá hace falta opaco, porque el bloque tapa las
  // columnas que pasan por debajo al scrollear. El mix va `in srgb` porque eso
  // es exactamente lo que hace el navegador al componer un color translúcido
  // sobre el fondo —mezclar en oklab da otro tono y el bloque se nota—.
  //
  // Aparece con el mismo fade que el hover de la fila: ambos usan la duración y
  // curva por defecto de Tailwind (150ms), uno sobre `color` y este sobre
  // `opacity`, así que entran juntos.
  //
  // `px-2` y no `px-3` como el resto de celdas: el overlay tiene que caber en el
  // `size` declarado. Con un botón icon (`size-8`) da 32+16 = 48, justo el
  // `size: 48` de auditoría; con dos, 84, dentro del `size: 96` del resto.
  //
  // `active` (fila en edición) lo deja fijo: los botones de guardar/cancelar
  // no pueden esconderse al salir el puntero.
  //
  // `insideSubRow` (tabla dentro de una sub-fila con `bg-muted/20`): usa ese
  // mismo tono como base del overlay. Mezclar `muted` con `--card` queda muy
  // oscuro sobre el gris de la sub-fila y los botones ghost se ven rellenos.
  //
  // El revelado por teclado va con `has(:focus-visible)` y no con `focus-within`:
  // al hacer click el botón queda enfocado y el bloque se quedaba pegado hasta
  // hacer click en otro lado —se nota al cerrar un diálogo de acción, que
  // devuelve el foco a su trigger—. `:focus-visible` solo lo activa el foco por
  // teclado, que es a quien apunta la regla.
  const overlayClass = (active = false) =>
    cn(
      "absolute inset-y-0 right-0 z-10 flex items-center gap-1 px-2",
      insideSubRow ? "bg-muted/20" : "bg-[color-mix(in_srgb,var(--muted)_50%,var(--card))]",
      "transition-opacity",
      active
        ? "opacity-100"
        : "opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100",
    )

  // Ancho y clases de la columna que absorbe el sobrante, para th y td.
  const growCellClass = (columnId: string) =>
    columnId === growColumnId ? growColumnClassName : undefined
  const growCellStyle = (columnId: string) =>
    columnId === growColumnId ? { width: "100%" } : undefined

  // Columna de respiro, JUSTO ANTES de la de acciones: el overlay está anclado
  // al borde derecho de su celda y crece hacia la IZQUIERDA, así que el hueco
  // tiene que quedar de ese lado. Si va después (al final de la fila) no
  // protege nada y los botones terminan encima de la última columna con datos.
  //
  // El ancho sale del `size` que cada `columns.tsx` declara para `actions`, así
  // que el hueco mide exactamente lo que ocupan los botones de esa tabla.
  //
  // El ancho va en un `div` interno además de en la celda: con
  // `table-layout: auto` el `width` de un `<td>` es solo una sugerencia y una
  // celda vacía tiene `min-content: 0`, así que el navegador la colapsa. Un
  // hijo con ancho fijo sí le da min-content real.
  const actionsColumn = visibleColumns.find((c) => isActionsColumn(c.id))
  const hasActionsColumn = actionsColumn !== undefined
  const columnCount = visibleColumns.length + (hasActionsColumn ? 1 : 0)
  const spacerWidth = actionsColumn?.getSize() ?? 96
  const spacerCell = (
    <td aria-hidden className="p-0">
      <div style={{ width: spacerWidth }} />
    </td>
  )

  return (
    // El borde, el radio y el scroll horizontal los pone el contenedor propio
    // de `Table`; acá no se envuelve en otro scroller para no anidar dos.
    <div className="w-full">
      <UITable className="w-full">
        <TableHeader>
          {/* El encabezado no lleva fondo propio ni hover: comparte el de la
              tabla en reposo, igual que una fila sin el puntero encima. */}
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
              key={headerGroup.id}
              className="hover:bg-transparent has-aria-expanded:bg-transparent"
            >
              {headerGroup.headers.map((header) => {
                const isActions = isActionsColumn(header.column.id)
                return (
                  <Fragment key={header.id}>
                    {isActions ? (
                      <th aria-hidden className="p-0">
                        <div style={{ width: spacerWidth }} />
                      </th>
                    ) : null}
                    <TableHead
                      className={cn(
                        "text-foreground",
                        cellClassName,
                        isActions && "w-px",
                        growCellClass(header.column.id),
                      )}
                      style={growCellStyle(header.column.id)}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  </Fragment>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isPending ? (
            Array.from({ length: skeletonRowCount }).map((_, i) => (
              <TableRow key={i}>
                {visibleColumns.map((col, j) => {
                  const isActions = isActionsColumn(col.id)
                  return (
                    <Fragment key={j}>
                      {isActions ? spacerCell : null}
                      <TableCell className={cn(cellClassName, isActions && actionsCellClass)}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    </Fragment>
                  )
                })}
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                {errorMessage}{" "}
                <Button size="sm" variant="link" onClick={onRetry}>
                  Reintentar
                </Button>
              </TableCell>
            </TableRow>
          ) : table.getRowModel().rows.length ? (
            table.getRowModel().rows.map((row) => {
              const active = isRowActive?.(row) ?? false
              const subRow = renderSubRow?.(row)
              return (
                <Fragment key={row.id}>
                  <TableRow data-state={row.getIsSelected() && "selected"} className="group/row">
                    {row.getVisibleCells().map((cell) => {
                      const isActions = isActionsColumn(cell.column.id)
                      return (
                        <Fragment key={cell.id}>
                          {isActions ? spacerCell : null}
                          <TableCell
                            className={cn(
                              cellClassName,
                              isActions && actionsCellClass,
                              growCellClass(cell.column.id),
                            )}
                            style={growCellStyle(cell.column.id)}
                          >
                            <div className={cn(isActions && overlayClass(active))}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </div>
                          </TableCell>
                        </Fragment>
                      )
                    })}
                  </TableRow>
                  {subRow != null && (
                    <TableRow className="hover:bg-transparent" data-sub-row>
                      <TableCell
                        colSpan={columnCount}
                        className="whitespace-normal bg-muted/20 p-4"
                      >
                        {subRow}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              )
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}

          {/* La fila de alta va siempre al pie, incluso con la tabla vacía: es
              la forma de cargar el primer registro. */}
          {!isPending && !isError && footerRow != null && (
            <TableRow className="group/row hover:bg-transparent">
              {footerRow({
                spacer: spacerCell,
                actionsCellClassName: actionsCellClass,
                actionsOverlayClassName: overlayClass(true),
              })}
            </TableRow>
          )}
        </TableBody>
      </UITable>
    </div>
  )
}

interface DataTableViewOptionsProps {
  table: Table<any>
}

export function DataTableViewOptions({ table }: DataTableViewOptionsProps) {
  const hideableColumns = table
    .getAllColumns()
    .filter((column) => typeof column.accessorFn !== "undefined" && column.getCanHide())

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" color="muted" size="icon" aria-label="Columnas visibles" />}
      >
        <GearIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Columnas visibles</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {hideableColumns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column.id}
              checked={column.getIsVisible()}
              onCheckedChange={(value) => column.toggleVisibility(!!value)}
            >
              {column.columnDef.meta?.label ?? column.id}
            </DropdownMenuCheckboxItem>
          ))}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>
  title: string
}

/**
 * Rendered inside `columnDef.header` callbacks (e.g. `columns.tsx`), which
 * hand it a `column` directly — no `DataTable` context needed here, all
 * state (`getIsSorted`, `toggleSorting`, `getCanHide`, ...) lives on the
 * `Column` object itself.
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return <div className={cn("text-sm font-medium", className)}>{title}</div>
  }

  const sorted = column.getIsSorted()

  return (
    <div className={cn("flex items-center", className)}>
      <DropdownMenu>
        {/* `text-sm`: el botón trae `text-xs` de la base y el encabezado tiene
            que leerse igual que las celdas. `px-3` + `-ml-3` alinean el título
            con el texto de la columna que va debajo. */}
        <DropdownMenuTrigger
          render={
            <Button
              size="sm"
              variant="ghost"
              color="neutral"
              className="-ml-3 h-8 px-3 text-sm font-bold uppercase has-data-[icon=inline-end]:pr-3 data-[state=open]:bg-accent"
            />
          }
        >
          {/* El indicador va DESPUÉS del título: en DOM order queda a la
              derecha. `data-icon` solo ajusta el padding de ese lado. */}
          <span>{title}</span>
          {sorted === "desc" ? (
            <ArrowDownIcon data-icon="inline-end" />
          ) : sorted === "asc" ? (
            <ArrowUpIcon data-icon="inline-end" />
          ) : (
            <CaretUpDownIcon data-icon="inline-end" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            {column.getCanSort() && (
              <>
                <DropdownMenuCheckboxItem
                  closeOnClick
                  checked={sorted === "asc"}
                  onCheckedChange={() =>
                    sorted === "asc" ? column.clearSorting() : column.toggleSorting(false)
                  }
                >
                  <ArrowUpIcon data-icon="inline-start" />
                  Asc
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  closeOnClick
                  checked={sorted === "desc"}
                  onCheckedChange={() =>
                    sorted === "desc" ? column.clearSorting() : column.toggleSorting(true)
                  }
                >
                  <ArrowDownIcon data-icon="inline-start" />
                  Desc
                </DropdownMenuCheckboxItem>
              </>
            )}
            {column.getCanHide() && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
                  <EyeSlashIcon data-icon="inline-start" />
                  Ocultar
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
