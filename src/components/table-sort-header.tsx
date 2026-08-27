import { ArrowDownIcon, ArrowUpIcon, CaretUpDownIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/overlay/dropdown-menu"

/**
 * Encabezado ordenable para las tablas que se arman a mano dentro de un diálogo
 * —las que ordenan con estado local en vez de con TanStack, así que no pueden
 * usar `DataTable` ni su `DataTableColumnHeader`—.
 *
 * El aspecto es el mismo que el de `DataTableColumnHeader` a propósito: si acá
 * se diverge, el encabezado de los modales deja de parecerse al del resto de la
 * app.
 */
export type TableSort<K extends string = string> = { key: K; dir: "asc" | "desc" } | null

/** Números por valor, el resto como texto con el orden del idioma. */
export function compareBySortKey(av: unknown, bv: unknown): number {
  if (typeof av === "number" && typeof bv === "number") return av - bv
  return String(av).localeCompare(String(bv))
}

export function sortBySortKey<K extends string, T extends Record<K, unknown>>(
  rows: T[],
  sort: TableSort<K>,
): T[] {
  if (!sort) return rows
  const { key, dir } = sort
  const copy = [...rows].sort((a, b) => compareBySortKey(a[key], b[key]))
  return dir === "desc" ? copy.reverse() : copy
}

interface TableSortableHeaderProps<K extends string> {
  title: string
  sortKey: K
  sort: TableSort<K>
  onSortChange: (next: TableSort<K>) => void
}

export function TableSortableHeader<K extends string>({
  title,
  sortKey,
  sort,
  onSortChange,
}: TableSortableHeaderProps<K>) {
  const active = sort?.key === sortKey ? sort.dir : null
  return (
    <div className="flex items-center">
      <DropdownMenu>
        {/* `color="neutral"` da el `text-foreground`; sin él el ghost cae en el
            color primary. `text-sm` pisa el `text-xs` de la base del botón, que
            es lo que dejaba el título más chico que las celdas. */}
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
          <span>{title}</span>
          {active === "desc" ? (
            <ArrowDownIcon data-icon="inline-end" />
          ) : active === "asc" ? (
            <ArrowUpIcon data-icon="inline-end" />
          ) : (
            <CaretUpDownIcon data-icon="inline-end" />
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuGroup>
            <DropdownMenuCheckboxItem
              closeOnClick
              checked={active === "asc"}
              onCheckedChange={() =>
                onSortChange(active === "asc" ? null : { key: sortKey, dir: "asc" })
              }
            >
              <ArrowUpIcon data-icon="inline-start" />
              Asc
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              closeOnClick
              checked={active === "desc"}
              onCheckedChange={() =>
                onSortChange(active === "desc" ? null : { key: sortKey, dir: "desc" })
              }
            >
              <ArrowDownIcon data-icon="inline-start" />
              Desc
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
