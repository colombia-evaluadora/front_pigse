import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

import {
  Pagination as UIPagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/data/pagination"

import { Field, FieldLabel } from "@/components/ui/field"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PaginationProps {
  // Controles extra que viven junto a la paginación, bajo la tabla (hoy: el
  // menú de columnas visibles, `DataTableViewOptions`).
  viewOptions?: ReactNode
  pageIndex: number
  pageCount: number
  canPrev: boolean
  canNext: boolean
  totalCount: number
  pageSize: number
  onPageChange: (pageIndex: number) => void
  onPageSizeChange: (pageSize: number) => void
}

function buildPageRange(current: number, total: number): (number | "ellipsis")[] {
  // Ventana con primera y última fija, y elippsis cuando hay huecos.
  const window = new Set<number>([1, total, current - 1, current, current + 1])
  const items: (number | "ellipsis")[] = []
  let last = 0
  for (const p of [...window].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)) {
    if (last && p - last > 1) items.push("ellipsis")
    items.push(p)
    last = p
  }
  return items
}

export function Pagination({
  viewOptions,
  pageIndex,
  pageCount,
  canPrev,
  canNext,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const range = buildPageRange(pageIndex + 1, pageCount)

  return (
    // Orden: selector de entradas (outline) → controles de página
    // (texto neutral, página activa en fill primario) → columnas visibles.
    // Se quita el "N registro(s)" que vivía a la izquierda porque ya no
    // aporta contexto (el conteo se puede leer del propio selector de filas).
    <div className="flex flex-wrap items-center justify-center gap-3 px-2 py-4 sm:gap-6">
      <UIPagination className="mx-0 w-auto justify-center">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={canPrev ? `#page=${pageIndex}` : undefined}
              aria-label="Página anterior"
              text="Previo"
              className={!canPrev ? "pointer-events-none opacity-50" : ""}
              onClick={(e) => {
                e.preventDefault()
                if (canPrev) onPageChange(pageIndex - 1)
              }}
            />
          </PaginationItem>

          <PaginationItem className="sm:hidden">
            <span className="px-2 text-sm text-muted-foreground">
              {pageIndex + 1}/{pageCount}
            </span>
          </PaginationItem>

          {range.map((item, i) =>
            item === "ellipsis" ? (
              <PaginationItem key={`e-${i}`} className="hidden sm:list-item">
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={item} className="hidden sm:list-item">
                <PaginationLink
                  href={`#page=${item}`}
                  isActive={item === pageIndex + 1}
                  // La activa rompe el outline del cva y se pinta en fill
                  // primario — sigue siendo la página actual, solo que con
                  // el peso visual que el resto del UI usa para "seleccionado".
                  className={cn(
                    item === pageIndex + 1 &&
                      "data-[active=true]:bg-primary data-[active=true]:text-primary-foreground data-[active=true]:border-primary",
                  )}
                  onClick={(e) => {
                    e.preventDefault()
                    onPageChange(item - 1)
                  }}
                >
                  {item}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              href={canNext ? `#page=${pageIndex + 2}` : undefined}
              aria-label="Página siguiente"
              text="Próximo"
              className={!canNext ? "pointer-events-none opacity-50" : ""}
              onClick={(e) => {
                e.preventDefault()
                if (canNext) onPageChange(pageIndex + 1)
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </UIPagination>
      <Field orientation="horizontal" className="hidden w-fit lg:flex">
        <Select value={`${pageSize}`} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger id="rows-per-page" variant="outlined" className="bg-muted/50 w-17">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {[10, 20, 30, 50].map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        <FieldLabel htmlFor="rows-per-page" className="text-sm normal-case text-muted-foreground">
          Entradas
        </FieldLabel>
      </Field>

      {viewOptions}
    </div>
  )
}
