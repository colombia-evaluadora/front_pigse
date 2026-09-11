import type { ReactNode } from "react"

import { CheckIcon, FunnelIcon, XIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import { InputGroupButton } from "@/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/overlay/popover"
import { cn } from "@/lib/utils"
import { FieldVariantContext } from "@/hooks/use-field-variant"

/**
 * El panel de "Filtros avanzados" que cuelga del embudo de cada buscador.
 *
 * Vive acá y no copiado en cada feature porque lo que comparte no es solo el
 * aspecto: también el comportamiento del disparador (relleno cuando hay
 * filtros puestos, contador en un badge) y la estructura del panel. Cuando
 * estaba duplicado en ocho buscadores, cada ajuste de diseño se aplicaba a
 * unos sí y a otros no.
 *
 * Los campos los pone cada buscador como `children`; lo de afuera —título,
 * scroll y el botón de aplicar— lo resuelve este componente.
 */
interface AdvancedFiltersPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Filtros puestos en total: decide si el embudo se ve activo. */
  activeFilterCount: number
  /** Cuántos de esos son avanzados: es el número del badge. */
  badgeCount: number
  /**
   * "Aplicar filtros" hace submit de este form. Los buscadores que no tienen
   * un `<form>` propio usan `onApply` en su lugar.
   */
  formId?: string
  onApply?: () => void
  /**
   * Deshabilita "Aplicar filtros" -- para buscadores donde una combinación
   * de campos a medio llenar no es un filtro válido (ver `SearchSeguimiento`,
   * que exige jornada+grado+grupo+asignatura completos). Por defecto
   * `false`: no todos los buscadores necesitan esta validación.
   */
  applyDisabled?: boolean
  /**
   * Ancho del panel según cuánto tenga que mostrar. `sm` para uno o dos
   * controles —un panel ancho con un solo select es casi todo espacio en
   * blanco—; `lg` cuando hay secciones que repartir en columnas.
   */
  size?: "sm" | "lg"
  children: ReactNode
  className?: string
}

export function AdvancedFiltersPopover({
  open,
  onOpenChange,
  activeFilterCount,
  badgeCount,
  formId,
  onApply,
  applyDisabled = false,
  size = "lg",
  children,
  className,
}: AdvancedFiltersPopoverProps) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        render={
          <InputGroupButton
            size="icon-xs"
            // Con filtros puestos el embudo se rellena (`fill muted`) para que
            // se lea como un estado activo, no como una acción más de la barra.
            variant={activeFilterCount > 0 ? "fill" : "ghost"}
            color="muted"
            aria-label="Filtros avanzados"
            aria-pressed={activeFilterCount > 0}
            className="relative"
          />
        }
      >
        <FunnelIcon />
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-3.5 items-center justify-center rounded-full bg-primary text-[0.55rem] font-semibold text-primary-foreground">
            {badgeCount}
          </span>
        )}
      </PopoverTrigger>

      {/*
        En `lg`, más ancho que un popover normal para que cada sección reparta
        sus controles en columnas, pero no tanto como para que el recorrido se
        vuelva horizontal. Siempre topado contra el viewport para que siga
        cabiendo en pantallas chicas.
      */}
      <PopoverContent
        align="end"
        className={cn(
          "gap-0 p-0",
          size === "lg" ? "w-[min(42rem,calc(100vw-2rem))]" : "w-[min(22rem,calc(100vw-2rem))]",
          className,
        )}
      >
        {/*
          Sin `border-b`: el panel se lee como un bloque continuo y la jerarquía
          la marca el tamaño del título, no una línea. El `PopoverTitle` del
          design system es versalita —pensado para popovers chicos—, y acá
          encabeza un panel entero.
        */}
        <PopoverHeader className="flex-row items-center justify-between px-4 pt-4">
          <PopoverTitle className="text-xl font-semibold normal-case">
            Filtros avanzados
          </PopoverTitle>
          <Button
            type="button"
            variant="fill"
            color="neutral"
            size="icon-xs"
            aria-label="Cerrar filtros avanzados"
            onClick={() => onOpenChange(false)}
          >
            <XIcon />
          </Button>
        </PopoverHeader>

        {/*
          El panel arranca con la variante de campo en `plain`. La barra de
          búsqueda envuelve todo en un `Field variant="outlined"` para su
          etiqueta flotante, y React propaga el contexto también a través del
          portal del popover: sin este corte, cada `FieldLabel` de acá dentro
          —los de las opciones con checkbox, que no cuelgan de un `Field`
          propio— se renderizaba flotante (`position: absolute`) y las opciones
          terminaban apiladas en la esquina del panel, con su contenedor en
          altura 0. Los campos que sí quieren label flotante declaran su
          `variant` y vuelven a poner el contexto.
        */}
        <div className="max-h-[60dvh] overflow-y-auto py-4">
          <FieldVariantContext.Provider value="outlined">{children}</FieldVariantContext.Provider>
        </div>

        {/*
          Sin "Limpiar todo": esa acción es la X de la barra, que está siempre a
          la vista y no obliga a abrir el panel.
        */}
        <div className="flex justify-end px-4 pb-4">
          <Button
            type={formId ? "submit" : "button"}
            form={formId}
            color="primary"
            size="sm"
            disabled={applyDisabled}
            onClick={onApply}
          >
            <CheckIcon data-icon="inline-start" />
            Aplicar filtros
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}
