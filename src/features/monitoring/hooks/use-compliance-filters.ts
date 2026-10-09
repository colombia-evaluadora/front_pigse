import { monitoreoCumplimientoRoute } from "@/router"

import type { ComplianceFilters } from "@/features/monitoring/api/types/compliance"

/** Vacío en la URL = `undefined`, para no dejar `?pei=` colgando. */
const orUndefined = (values: string[]) => (values.length ? values : undefined)

/**
 * Filtros del tablero en la URL (`?pec=PARCIAL&plazo=VENCIDO`). Aplicar o
 * limpiar vuelve a la página 0: la página actual puede no existir con el
 * filtro nuevo.
 */
export function useComplianceFilters() {
  const search = monitoreoCumplimientoRoute.useSearch()
  const navigate = monitoreoCumplimientoRoute.useNavigate()

  const filters: ComplianceFilters = {
    search: search.search ?? "",
    pei: search.pei ?? [],
    pec: search.pec ?? [],
    pmi: search.pmi ?? [],
    pfi: search.pfi ?? [],
    plazo: search.plazo ?? [],
    etnias: search.etnias ?? "",
  }

  function applyFilters(values: ComplianceFilters) {
    navigate({
      search: (prev) => ({
        ...prev,
        search: values.search || undefined,
        pei: orUndefined(values.pei),
        pec: orUndefined(values.pec),
        pmi: orUndefined(values.pmi),
        pfi: orUndefined(values.pfi),
        plazo: orUndefined(values.plazo),
        etnias: (values.etnias || undefined) as "S" | "N" | undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  function clearAllFilters() {
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        pei: undefined,
        pec: undefined,
        pmi: undefined,
        pfi: undefined,
        plazo: undefined,
        etnias: undefined,
        page: 0,
      }),
      replace: true,
    })
  }

  const activeFilterCount =
    (filters.search ? 1 : 0) +
    (filters.pei.length ? 1 : 0) +
    (filters.pec.length ? 1 : 0) +
    (filters.pmi.length ? 1 : 0) +
    (filters.pfi.length ? 1 : 0) +
    (filters.plazo.length ? 1 : 0) +
    (filters.etnias ? 1 : 0)

  return { filters, applyFilters, clearAllFilters, activeFilterCount }
}
