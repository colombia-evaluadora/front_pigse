import { cn } from "@/lib/utils"

import type { ComplianceFilters } from "@/features/monitoring/api/types/compliance"

interface QuickView {
  id: string
  label: string
  /** Qué parte de los filtros fija la vista. */
  patch: Pick<ComplianceFilters, "plazo" | "pei" | "pec" | "pmi" | "pfi">
}

const NONE = { plazo: [], pei: [], pec: [], pmi: [], pfi: [] }

/**
 * Las preguntas que el monitor se hace a diario, a un clic: "¿quién se pasó
 * de la fecha?", "¿a quién le di prórroga?", "¿quién no ha subido nada?". Son
 * atajos de los mismos filtros del buscador (quedan escritos en él y en la
 * URL), no un estado aparte.
 */
const VIEWS: QuickView[] = [
  { id: "todos", label: "Todos", patch: NONE },
  { id: "vencidos", label: "Vencidos sin completar", patch: { ...NONE, plazo: ["VENCIDO"] } },
  { id: "prorroga", label: "Con prórroga", patch: { ...NONE, plazo: ["PRORROGA"] } },
  {
    id: "sin-cargar",
    label: "Proyecto educativo sin cargar",
    // PEI y PEC son excluyentes por ETNIAS: el que no aplica llega NO_APLICA.
    // Aceptarlo en ambos filtros deja pasar al EE cuyo tipo aplicable está
    // SIN_CARGAR, sea regular (PEI) o etnoeducativo (PEC).
    patch: { ...NONE, pei: ["SIN_CARGAR", "NO_APLICA"], pec: ["SIN_CARGAR", "NO_APLICA"] },
  },
]

function sameArray(a: string[], b: string[]) {
  return a.length === b.length && a.every((value) => b.includes(value))
}

function isActive(view: QuickView, filters: ComplianceFilters) {
  return (["plazo", "pei", "pec", "pmi", "pfi"] as const).every((key) =>
    sameArray(filters[key], view.patch[key]),
  )
}

export function QuickFilters({
  filters,
  applyFilters,
}: {
  filters: ComplianceFilters
  applyFilters: (values: ComplianceFilters) => void
}) {
  return (
    <div role="group" aria-label="Vistas rápidas" className="mb-3 flex flex-wrap gap-2">
      {VIEWS.map((view) => {
        const active = isActive(view, filters)
        return (
          <button
            key={view.id}
            type="button"
            aria-pressed={active}
            onClick={() => applyFilters({ ...filters, ...view.patch })}
            className={cn(
              "inline-flex h-8 items-center rounded-full border px-3 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              active
                ? "border-primary bg-primary-22 text-primary"
                : "border-border bg-background text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {view.label}
          </button>
        )
      })}
    </div>
  )
}
