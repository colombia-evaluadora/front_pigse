import type { ReactNode } from "react"

import { MagnifyingGlassIcon, XIcon } from "@/components/ui/icons"
import { AdvancedFiltersPopover } from "@/components/search/advanced-filters-popover"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { cn } from "@/lib/utils"

/**
 * La barra de búsqueda de los listados: el input, la X que limpia todo y el
 * embudo con el panel de filtros avanzados.
 *
 * Los filtros aplicados se ven dentro del input, en la sintaxis de
 * `query-syntax.ts` —`estado:(Activo)`—, no como chips debajo. Por eso acá no
 * hay nada que renderizar bajo la barra: quitar un filtro es borrar su texto,
 * y la altura de la barra no cambia según cuántos filtros haya puestos.
 *
 * Los campos del panel los pone cada buscador como `children`.
 */
interface SearchQueryBarProps {
  /** Id del control: lo necesita el `htmlFor` de la etiqueta. */
  id: string
  /**
   * Etiqueta visible. `null` para las barras que van dentro de un tab y ya
   * tienen contexto alrededor: ahí el nombre accesible lo da `aria-label`.
   */
  label?: string | null
  placeholder: string
  value: string
  onValueChange: (value: string) => void
  /** Limpia texto y filtros de una vez. */
  onClearAll: () => void
  /** Filtros puestos en total: decide si el embudo se ve activo. */
  activeFilterCount: number
  /** Cuántos de esos son avanzados: es el número del badge. */
  badgeCount: number
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Aplicar filtros" hace submit de este form… */
  formId?: string
  /** …o llama a esto, si el panel no tiene un `<form>` propio. */
  onApply?: () => void
  /** Ancho del panel de filtros. */
  size?: "sm" | "lg"
  /** Ancho de la barra; por defecto la misma medida en todos los listados. */
  className?: string
  children: ReactNode
}

export function SearchQueryBar({
  id,
  label = "Buscar",
  placeholder,
  value,
  onValueChange,
  onClearAll,
  activeFilterCount,
  badgeCount,
  open,
  onOpenChange,
  formId,
  onApply,
  size,
  className,
  children,
}: SearchQueryBarProps) {
  const input = (
    <InputGroup className="h-10 w-full rounded-md border-input has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-2 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/20">
      <InputGroupAddon align="inline-start" className="ml-2">
        <MagnifyingGlassIcon className="size-4 text-muted-foreground" />
      </InputGroupAddon>

      <InputGroupInput
        id={id}
        type="search"
        autoComplete="off"
        placeholder={placeholder}
        aria-label={label ? undefined : placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        // La X que Chrome inyecta en los `type="search"` duplicaba a la
        // nuestra —y con otro estilo—, así que se apaga y queda una sola
        // forma de limpiar.
        className="min-w-32 [&::-webkit-search-cancel-button]:appearance-none"
      />

      <InputGroupAddon align="inline-end" className="mr-1 gap-1">
        {/* La X limpia todo —texto y filtros—, así que solo aparece cuando
            hay algo que limpiar. */}
        {(activeFilterCount > 0 || value !== "") && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            color="muted"
            aria-label="Limpiar búsqueda y filtros"
            onClick={onClearAll}
          >
            <XIcon />
          </InputGroupButton>
        )}

        <AdvancedFiltersPopover
          open={open}
          onOpenChange={onOpenChange}
          activeFilterCount={activeFilterCount}
          badgeCount={badgeCount}
          formId={formId}
          onApply={onApply}
          size={size}
        >
          {children}
        </AdvancedFiltersPopover>
      </InputGroupAddon>
    </InputGroup>
  )

  if (!label) return <div className={cn("w-full sm:w-96", className)}>{input}</div>

  // El `Field` outlined solo aporta la etiqueta flotante: el borde y el foco
  // los sigue pintando el propio `InputGroup`. Sin `aria-label` en el control,
  // para que el nombre accesible lo dé la etiqueta visible.
  return (
    <Field orientation="vertical" variant="outlined" className={cn("w-full max-w-xl", className)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {input}
    </Field>
  )
}
