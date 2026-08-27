import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import type { SortingState } from "@tanstack/react-table"
import { useNavigate, useSearch } from "@tanstack/react-router"

import type { DataTableFilters } from "@/hooks/use-data-table"

const TablePaginationContext = createContext<DataTableFilters | null>(null)

/**
 * Paginación y orden en estado local, fuera del router. Útil para tablas que
 * no tienen que compartir su posición con la URL (modales, sub-tablas), donde
 * la URL describe otra cosa y dos tablas a la vez se pisarían las claves
 * `page`/`sortBy`.
 *
 * Por defecto, `useTablePagination` lee y escribe en los search params de la
 * ruta. Envolver esta tabla en el provider cambia el origen del estado sin que
 * el componente de la tabla se entere.
 */
export function TablePaginationProvider({
  defaultPageSize = 10,
  children,
}: {
  defaultPageSize?: number
  children: ReactNode
}) {
  const [pageIndex, setPageIndex] = useState(0)
  const [pageSize, setPageSize] = useState(defaultPageSize)
  const [sorting, setSorting] = useState<SortingState>([])

  const value = useMemo<DataTableFilters>(
    () => ({
      pageIndex,
      pageSize,
      goToPage: setPageIndex,
      // Cambiar el tamaño o el orden vuelve a la primera página: la posición
      // vieja ya no significa lo mismo. Mismo criterio que la variante de URL.
      setPageSize: (next) => {
        setPageSize(next)
        setPageIndex(0)
      },
      sorting,
      setSorting: (next) => {
        setSorting(next)
        setPageIndex(0)
      },
    }),
    [pageIndex, pageSize, sorting],
  )

  return <TablePaginationContext.Provider value={value}>{children}</TablePaginationContext.Provider>
}

/** El estado vive en los search params de la ruta. Es la variante por defecto. */
function useUrlTablePagination(): DataTableFilters {
  const search = useSearch({ strict: false }) as {
    page?: number
    pageSize?: number
    sortBy?: string
    sortDir?: "asc" | "desc"
  }
  const navigate = useNavigate() as unknown as (opts: {
    search: (prev: Record<string, unknown>) => Record<string, unknown>
    replace?: boolean
  }) => void

  const sorting: SortingState = search.sortBy
    ? [{ id: search.sortBy, desc: search.sortDir === "desc" }]
    : []

  const goToPage = useCallback(
    (nextPageIndex: number) => {
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          page: nextPageIndex,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  const setPageSize = useCallback(
    (nextPageSize: number) => {
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          pageSize: nextPageSize,
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  const setSorting = useCallback(
    (next: { id: string; desc: boolean }[]) => {
      const [first] = next
      navigate({
        search: (prev: Record<string, unknown>) => ({
          ...prev,
          sortBy: first?.id,
          sortDir: first ? (first.desc ? "desc" : "asc") : undefined,
          page: 0,
        }),
        replace: true,
      })
    },
    [navigate],
  )

  return {
    pageIndex: search.page ?? 0,
    pageSize: search.pageSize ?? 10,
    goToPage,
    setPageSize,
    sorting,
    setSorting,
  }
}

/**
 * Estado de paginación y orden de una tabla. Por defecto sale de los search
 * params de la ruta; si la tabla está envuelta en `TablePaginationProvider`,
 * sale del context.
 *
 * La regla es por árbol: el provider más cercano gana. Si una tabla dentro de
 * un modal está envuelta y la tabla de la página no, las dos funcionan
 * independientemente: la del modal con context, la de la página con URL.
 */
export function useTablePagination(): DataTableFilters {
  const fromContext = useContext(TablePaginationContext)
  const fromUrl = useUrlTablePagination()
  return fromContext ?? fromUrl
}
