import { optionTerm, type QueryOption, type QuerySyntax } from "@/components/search/query-syntax"

import type { UserActivityFiltersFormValues } from "@/features/administration/user-activity/api/schema"

/**
 * Actividad de usuarios: la búsqueda libre es nombre, documento, correo o
 * el nombre/código del EE (lo mismo que resuelve `filters.search` en el
 * backend). `estado` y `establecimiento` son catálogos chicos/dinámicos, así
 * que además de vivir en el popover se reflejan como términos —igual que
 * `estado` en `auditSessionsSyntax`— para que el texto de la barra sea la
 * fuente de verdad completa y sobreviva a "limpiar todo"/atrás del navegador.
 */
export function userActivitySyntax(
  statusOptions: QueryOption[],
  establishmentOptions: QueryOption[],
): QuerySyntax<UserActivityFiltersFormValues> {
  return {
    empty: { search: "", establecimientoId: "", estado: "" },
    freeText: { key: "buscar", field: "search" },
    terms: [
      optionTerm("estado", "estado", statusOptions),
      optionTerm("establecimiento", "establecimientoId", establishmentOptions),
    ],
  }
}
