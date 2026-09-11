import { useEffect, useRef, useState } from "react"

import { buildQuery, parseQuery, sameFilters, type QuerySyntax } from "@/components/search/query-syntax"

/** Retardo del buscador para no navegar en cada tecla. */
export const SEARCH_DEBOUNCE_MS = 350

interface UseQuerySearchOptions<F extends object> {
  syntax: QuerySyntax<F>
  /** Los filtros vigentes; en general vienen de la URL. */
  filters: F
  applyFilters: (filters: F) => void
}

/**
 * Mantiene el input y los filtros de la URL como dos caras de lo mismo: el
 * texto se parsea a filtros (con retardo) y los filtros se serializan de
 * vuelta al texto cuando cambian por fuera —el popover, "limpiar todo", el
 * botón atrás del navegador—.
 *
 * Vive acá y no copiado en cada buscador porque el orden de esos dos efectos
 * y sus guardas son lo delicado del asunto: sin ellas el input pierde el
 * cursor mientras se escribe o se queda pisando lo que acaba de aplicarse.
 */
export function useQuerySearch<F extends object>({
  syntax,
  filters,
  applyFilters,
}: UseQuerySearchOptions<F>) {
  const queryFromFilters = buildQuery(syntax, filters)
  const [search, setSearch] = useState(queryFromFilters)

  // Refs para leer siempre lo último dentro del debounce sin re-suscribir el
  // efecto en cada cambio de `filters`/`applyFilters`.
  const latest = useRef({ syntax, filters, applyFilters })
  latest.current = { syntax, filters, applyFilters }

  // Sincroniza hacia el input los cambios que no vienen de teclear. La guarda
  // evita pisar lo escrito cuando el texto ya significa lo mismo que los
  // filtros.
  useEffect(() => {
    setSearch((current) => {
      const { syntax, filters } = latest.current
      return sameFilters(syntax, parseQuery(syntax, current), filters) ? current : queryFromFilters
    })
  }, [queryFromFilters])

  // Aplica la consulta escrita, con retardo para no navegar en cada tecla.
  useEffect(() => {
    const timeout = setTimeout(() => {
      const { syntax, filters, applyFilters } = latest.current
      const parsed = parseQuery(syntax, search)
      if (sameFilters(syntax, parsed, filters)) return
      applyFilters(parsed)
    }, SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timeout)
  }, [search])

  return {
    search,
    setSearch,
    /**
     * La búsqueda libre que hay escrita ahora mismo. El popover no la toca:
     * reescribe el resto de la consulta y conserva este valor.
     */
    freeText: String(
      (parseQuery(syntax, search) as Record<string, unknown>)[syntax.freeText.field] ?? "",
    ),
  }
}
