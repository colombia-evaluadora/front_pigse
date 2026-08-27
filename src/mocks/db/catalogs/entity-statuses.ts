import type { CatalogItem } from "@/types/catalog"

/**
 * Estados de entidad compartidos por `establishment` y `employee`.
 *
 * Es un catálogo "neutro" — la etiqueta visible (`name`) es "Activo" /
 * "Suspendido" para ambos casos. Donde se necesite una forma con género
 * distinto (p. ej. "Activa" en establecimientos) se hace un mapeo local
 * en la feature, no en el catálogo.
 *
 * El color del badge sigue viviendo en `*_BADGE` (TS) porque es una
 * decisión de presentación, no de dominio.
 */
export const ENTITY_STATUSES: CatalogItem[] = [
  { id: 1, code: "ACTIVE", name: "Activo" },
  { id: 2, code: "SUSPENDED", name: "Suspendido" },
]
