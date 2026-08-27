"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@/lib/utils"
import { CaretDownIcon, CheckIcon, CaretUpIcon } from "@/components/ui/icons"
import {
  inputTriggerVariants,
  inputVariants,
  useInputVariant,
  type InputVariant,
} from "@/components/ui/input"

/**
 * Mapa opcional `value → label` que el `Select` raíz puede pasar para que el
 * `SelectValue` lo consulte en vez de tener que pintarlo a mano con un
 * `children` función. Aceptamos la unión completa de Base UI (record | array
 * de `{label, value}` | array de `Group`) para no romper los call sites que
 * usan el formato nativo. Si llega un array, `SelectValue` cae al `children`
 * (típicamente `placeholder`).
 */
type SelectItemsMap = Record<string, React.ReactNode>

const SelectItemsContext = React.createContext<SelectItemsMap | undefined>(undefined)

function isLookupMap(items: unknown): items is SelectItemsMap {
  return items !== null && typeof items === "object" && !Array.isArray(items)
}

function useSelectItems() {
  return React.useContext(SelectItemsContext)
}

type SelectProps<Value, Multiple extends boolean | undefined = false> = SelectPrimitive.Root.Props<
  Value,
  Multiple
> & {
  /**
   * `items` admite dos formas:
   * - `Record<value, label>`: `SelectValue` lo usa como lookup para mostrar el
   *   label del valor seleccionado en el trigger.
   * - El formato nativo de Base UI (`ReadonlyArray<{ label, value }>` o
   *   `ReadonlyArray<Group<…}>`): se pasa tal cual a `Select.Root` y el
   *   trigger cae al `children` (placeholder por default).
   *
   * Aceptamos la unión para no romper los call sites que ya usaban el
   * formato nativo con el `Select` antiguo.
   */
  items?: SelectPrimitive.Root.Props<Value, Multiple>["items"]
}

/**
 * Wrapper sobre `SelectPrimitive.Root` que conserva los genéricos `<Value,
 * Multiple>` — fundamentales para que TS infiera el tipo del `value` en
 * `onValueChange` desde el `value` prop. Sin declararlos acá, el wrapper
 * pierde la generic y los call sites quedan con `selectedValue: any`.
 */
function Select<Value, Multiple extends boolean | undefined = false>({
  items,
  children,
  ...props
}: SelectProps<Value, Multiple>) {
  // El contexto del `SelectValue` solo entiende la forma `Record<value, label>`.
  // El resto de los formatos pasan a `SelectPrimitive.Root` y `SelectValue`
  // cae al `children` (placeholder por default).
  const lookupMap = isLookupMap(items) ? items : undefined
  return (
    <SelectItemsContext.Provider value={lookupMap}>
      <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>
    </SelectItemsContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1.5 p-1.5", className)}
      {...props}
    />
  )
}

function SelectValue({
  className,
  // Texto por defecto de TODOS los selects sin valor. Se define acá y no en
  // cada formulario para que el vacío se lea igual en toda la app; pasar
  // `placeholder` sigue funcionando para los casos con semántica propia (los
  // filtros usan "Todos", porque ahí vacío significa "sin filtro").
  placeholder = "Seleccionar",
  children,
  ...props
}: SelectPrimitive.Value.Props) {
  const items = useSelectItems()

  // Si el `Select` raíz recibió `items`, lo usamos como lookup y descartamos
  // `children` — coexistirían en el render y el `children` ganaría siempre que
  // sea función, dejando al `items` como una promesa vacía.
  // El fallback al `placeholder` cubre el valor ausente (`null`) y también el
  // que no está en el mapa: sin él, el trigger quedaba literalmente en blanco.
  const renderChildren = items
    ? (value: unknown) =>
        (value === null || value === undefined ? null : items[String(value)]) ?? placeholder
    : children

  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      // block (no flex): el text-overflow no aplica al contenido anónimo de un
      // flex container, así que con display:flex el "…" nunca se dibuja. min-w-0
      // es lo que deja al item encogerse por debajo del ancho de su contenido.
      className={cn("block min-w-0 flex-1 truncate text-left", className)}
      {...props}
    >
      {renderChildren}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  variant,
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
  variant?: InputVariant
}) {
  const resolvedVariant = useInputVariant(variant)

  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        inputVariants({ variant: resolvedVariant, size }),
        inputTriggerVariants({ variant: resolvedVariant }),
        // El recorte del valor lo resuelve SelectValue con block+truncate; acá no
        // se le impone display, porque el flex anulaba ese text-overflow y dejaba
        // al line-clamp inerte, que era lo que hacía desbordar al valor largo.
        "flex items-center justify-between gap-1.5 whitespace-nowrap data-placeholder:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={<CaretDownIcon className="pointer-events-none size-3.5 text-muted-foreground" />}
      />
    </SelectPrimitive.Trigger>
  )
}

/**
 * `alignItemWithTrigger` en `false`: con el default de Base UI el popup se
 * posiciona para que la opción elegida quede sobre el trigger —el
 * comportamiento del select nativo de macOS—, así que tapa el campo. Acá el
 * desplegable cae DEBAJO del input, como el resto de los popovers de la app,
 * y el campo se sigue viendo mientras se elige.
 */
function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            // flex-col + overflow-hidden y NO overflow-y-auto: el scroll vive en
            // la `List`, no acá. Si el popup es el scroller, la capa de vidrio
            // (`before:inset-0`) mide solo el alto visible y se desplaza con el
            // contenido, así que al bajar la lista el fondo blureado desaparece
            // y el `bg-popover/70` deja ver la página de atrás.
            "isolate z-50 flex max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) flex-col overflow-hidden rounded-lg text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
            className,
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1.5">
            {children}
          </SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({ className, ...props }: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn(
        "px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  )
}

function SelectItem({ className, children, ...props }: SelectPrimitive.Item.Props) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "group/select-item relative flex w-full cursor-pointer items-center gap-2.5 rounded-md py-2 pr-8 pl-3 text-sm transition-colors outline-hidden select-none data-highlighted:bg-secondary-22 data-highlighted:text-foreground not-data-[variant=destructive]:data-highlighted:**:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      {/*
        block + min-w-0 en vez de flex: el text-overflow no aplica al contenido
        anónimo de un flex container, así que con display:flex la opción larga se
        cortaba a mitad de letra en lugar de terminar en "…". Tampoco shrink-0,
        que impedía que el texto se encogiera al ancho del popup. El pr-8 del item
        reserva el lugar del check, así que el "…" nunca se le encima.
      */}
      <SelectPrimitive.ItemText className="block min-w-0 flex-1 truncate">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({ className, ...props }: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1.5 my-1.5 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      <CaretUpIcon />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      <CaretDownIcon />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
