"use client"

import * as React from "react"
import { Combobox as ComboboxPrimitive } from "@base-ui/react"
import { cva } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  inputTriggerVariants,
  inputVariants,
  useInputVariant,
  type InputVariant,
} from "@/components/ui/input"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { CaretDownIcon, XIcon, CheckIcon } from "@/components/ui/icons"

const Combobox = ComboboxPrimitive.Root

function ComboboxValue({ ...props }: ComboboxPrimitive.Value.Props) {
  return <ComboboxPrimitive.Value data-slot="combobox-value" {...props} />
}

function ComboboxTrigger({ className, children, ...props }: ComboboxPrimitive.Trigger.Props) {
  return (
    <ComboboxPrimitive.Trigger
      data-slot="combobox-trigger"
      className={cn("[&_svg:not([class*='size-'])]:size-3.5", className)}
      {...props}
    >
      {children}
      <CaretDownIcon className="pointer-events-none size-3.5 text-muted-foreground" />
    </ComboboxPrimitive.Trigger>
  )
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      render={<InputGroupButton variant="ghost" size="icon-xs" />}
      className={cn(className)}
      {...props}
    >
      <XIcon className="pointer-events-none" />
    </ComboboxPrimitive.Clear>
  )
}

function ComboboxInput({
  className,
  children,
  disabled = false,
  showTrigger = true,
  showClear = false,
  ...props
}: ComboboxPrimitive.Input.Props & {
  showTrigger?: boolean
  showClear?: boolean
}) {
  return (
    <InputGroup className={cn("w-auto", className)}>
      <ComboboxPrimitive.Input render={<InputGroupInput disabled={disabled} />} {...props} />
      <InputGroupAddon align="inline-end">
        {showTrigger && (
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            render={<ComboboxTrigger />}
            data-slot="input-group-button"
            className="group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent"
            disabled={disabled}
          />
        )}
        {showClear && <ComboboxClear disabled={disabled} />}
      </InputGroupAddon>
      {children}
    </InputGroup>
  )
}

function ComboboxContent({
  className,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "side" | "align" | "sideOffset" | "alignOffset" | "anchor"
  >) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        anchor={anchor}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          data-chips={!!anchor}
          className={cn(
            "dark group/combobox-content max-h-(--available-height) w-(--anchor-width) max-w-(--available-width) min-w-[calc(var(--anchor-width)+--spacing(7))] origin-(--transform-origin) overflow-hidden rounded-lg text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1.5 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-transparent *:data-[slot=input-group]:bg-transparent *:data-[slot=input-group]:px-2.5 *:data-[slot=input-group]:focus-within:border-transparent data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-item]:focus:bg-foreground/10 **:data-[slot$=-item]:data-highlighted:bg-foreground/10 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
            className,
          )}
          {...props}
        />
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn(
        "no-scrollbar max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))] scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5 data-empty:p-0",
        className,
      )}
      {...props}
    />
  )
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex w-full cursor-default items-center gap-2.5 rounded-md py-2 pr-8 pl-3 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

function ComboboxGroup({ className, ...props }: ComboboxPrimitive.Group.Props) {
  return <ComboboxPrimitive.Group data-slot="combobox-group" className={cn(className)} {...props} />
}

function ComboboxLabel({ className, ...props }: ComboboxPrimitive.GroupLabel.Props) {
  return (
    <ComboboxPrimitive.GroupLabel
      data-slot="combobox-label"
      className={cn(
        "px-3 py-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase",
        className,
      )}
      {...props}
    />
  )
}

function ComboboxCollection({ ...props }: ComboboxPrimitive.Collection.Props) {
  return <ComboboxPrimitive.Collection data-slot="combobox-collection" {...props} />
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn(
        "hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex",
        className,
      )}
      {...props}
    />
  )
}

function ComboboxSeparator({ className, ...props }: ComboboxPrimitive.Separator.Props) {
  return (
    <ComboboxPrimitive.Separator
      data-slot="combobox-separator"
      className={cn("-mx-1.5 my-1.5 h-px bg-border/50", className)}
      {...props}
    />
  )
}

function ComboboxChips({
  className,
  ...props
}: React.ComponentPropsWithRef<typeof ComboboxPrimitive.Chips> & ComboboxPrimitive.Chips.Props) {
  return (
    <ComboboxPrimitive.Chips
      data-slot="combobox-chips"
      className={cn(
        "flex min-h-10 flex-wrap items-center gap-1.5 rounded-none border border-transparent border-b-input bg-transparent bg-clip-padding px-0 py-1.5 text-sm transition-[color,border-color] focus-within:border-b-ring has-aria-invalid:border-b-red has-data-[slot=combobox-chip]:px-0 dark:has-aria-invalid:border-b-red/50",
        className,
      )}
      {...props}
    />
  )
}

function ComboboxChip({
  className,
  children,
  showRemove = true,
  ...props
}: ComboboxPrimitive.Chip.Props & {
  showRemove?: boolean
}) {
  return (
    <ComboboxPrimitive.Chip
      data-slot="combobox-chip"
      className={cn(
        "flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-none bg-muted px-2 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0",
        className,
      )}
      {...props}
    >
      {children}
      {showRemove && (
        <ComboboxPrimitive.ChipRemove
          render={<Button variant="ghost" size="icon-xs" />}
          className="-ml-1 opacity-50 hover:opacity-100"
          data-slot="combobox-chip-remove"
        >
          <XIcon className="pointer-events-none" />
        </ComboboxPrimitive.ChipRemove>
      )}
    </ComboboxPrimitive.Chip>
  )
}

function ComboboxChipsInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <ComboboxPrimitive.Input
      data-slot="combobox-chip-input"
      className={cn("min-w-16 flex-1 outline-none", className)}
      {...props}
    />
  )
}

function useComboboxAnchor() {
  return React.useRef<HTMLDivElement | null>(null)
}

export {
  Combobox,
  ComboboxInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxGroup,
  ComboboxLabel,
  ComboboxCollection,
  ComboboxEmpty,
  ComboboxSeparator,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxTrigger,
  ComboboxValue,
  useComboboxAnchor,
}

/* -------------------------------------------------------------------------
 * ComboboxField — el combobox con forma de campo de formulario
 *
 * Es el reemplazo de lo que antes era `Select`: se ve igual que un `Input`
 * (mismas variantes y alturas), pero el trigger es un `<input>` de verdad, así
 * que se escribe para filtrar la lista. Lo tecleado NUNCA es el valor: el valor
 * solo cambia al elegir una opción, y al cerrar el popup la consulta se
 * descarta y el campo vuelve a mostrar la opción seleccionada.
 *
 * A diferencia de `Combobox` + `ComboboxCollection`, acá cada formulario pinta
 * sus opciones a mano con `.map()`, así que el filtro interno de Base UI —que
 * solo alcanza a los items de una `Collection`— queda apagado y filtra
 * `ComboboxFieldItem`.
 * ---------------------------------------------------------------------- */

/**
 * Mapa opcional `value → label` que `ComboboxField` puede pasar para que
 * `ComboboxFieldValue` lo consulte en vez de tener que pintarlo a mano con un
 * `children` función. Aceptamos también el formato nativo de Base UI
 * (`ReadonlyArray<{label, value}>` | array de `Group`) para no romper los call
 * sites que lo usan: si llega un array, el valor cae al `children`.
 */
type ComboboxItemsMap = Record<string, React.ReactNode>

const ComboboxItemsContext = React.createContext<ComboboxItemsMap | undefined>(undefined)

/**
 * Estado del filtrado. Lo publica la raíz porque lo consumen partes que viven
 * en árboles distintos: el campo (para tapar el input con el valor mientras no
 * se escribe) y cada item, que está dentro del portal del popup.
 */
interface ComboboxFilterState {
  query: string
  /** Alta/baja de items visibles; alimenta el "Sin resultados". */
  register: (id: string, visible: boolean) => void
  visibleCount: number
}

const ComboboxFilterContext = React.createContext<ComboboxFilterState>({
  query: "",
  register: () => {},
  visibleCount: 0,
})

/** Ancla del popup: el recuadro del campo, no el `<input>` ni el botón del caret. */
const ComboboxAnchorContext = React.createContext<React.RefObject<HTMLDivElement | null> | null>(
  null,
)

function isLookupMap(items: unknown): items is ComboboxItemsMap {
  return items !== null && typeof items === "object" && !Array.isArray(items)
}

/** Razones por las que el input cambia por tecleo del usuario (y no por selección). */
const TYPING_REASONS = new Set(["input-change", "input-paste", "input-clear"])

/** Sin tildes, sin mayúsculas: "bogota" tiene que encontrar "BOGOTÁ D.C.". */
function normalizeText(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

/**
 * Texto buscable de un item. Los items no declaran un label plano: su contenido
 * puede ser una cadena, o un `<span>` con ícono + texto + badge. Se recorre el
 * árbol y se juntan las hojas de texto.
 */
function nodeToText(node: React.ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(nodeToText).join(" ")
  if (React.isValidElement(node)) {
    return nodeToText((node.props as { children?: React.ReactNode }).children)
  }
  return ""
}

/** Cada palabra de la consulta tiene que aparecer; así "juan gomez" matchea "Gómez, Juan". */
function matchesQuery(haystack: string, query: string) {
  const target = normalizeText(haystack)
  return normalizeText(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => target.includes(token))
}

type ComboboxFieldProps<Value, Multiple extends boolean | undefined = false> = Omit<
  ComboboxPrimitive.Root.Props<Value, Multiple>,
  "items"
> & {
  items?: ComboboxItemsMap | ComboboxPrimitive.Root.Props<Value, Multiple>["items"]
}

/**
 * Raíz. Conserva los genéricos `<Value, Multiple>` — fundamentales para que TS
 * infiera el tipo del valor en `onValueChange` desde el `value` prop. Sin
 * declararlos acá, el wrapper pierde la generic y los call sites quedan con
 * `selectedValue: any`.
 */
function ComboboxField<Value, Multiple extends boolean | undefined = false>({
  items,
  children,
  onInputValueChange,
  onOpenChange,
  ...props
}: ComboboxFieldProps<Value, Multiple>) {
  const lookupMap = isLookupMap(items) ? items : undefined
  const nativeItems = isLookupMap(items)
    ? undefined
    : (items as ComboboxPrimitive.Root.Props<Value, Multiple>["items"])

  const anchorRef = React.useRef<HTMLDivElement | null>(null)
  const [query, setQuery] = React.useState("")

  // Set (no contador) para que el alta/baja sea idempotente: los items se
  // montan y desmontan de a cientos y el `size` siempre queda consistente.
  const visibleRef = React.useRef(new Set<string>())
  const [visibleCount, setVisibleCount] = React.useState(0)
  const register = React.useCallback((id: string, visible: boolean) => {
    const set = visibleRef.current
    if (visible) set.add(id)
    else set.delete(id)
    setVisibleCount(set.size)
  }, [])

  const filterState = React.useMemo<ComboboxFilterState>(
    () => ({ query, register, visibleCount }),
    [query, register, visibleCount],
  )

  return (
    <ComboboxItemsContext.Provider value={lookupMap}>
      <ComboboxAnchorContext.Provider value={anchorRef}>
        <ComboboxFilterContext.Provider value={filterState}>
          <ComboboxPrimitive.Root
            items={nativeItems}
            filter={null}
            // La primera coincidencia queda resaltada mientras se escribe, así
            // Enter elige sin tener que bajar con las flechas.
            autoHighlight
            openOnInputClick
            // El input está controlado por la consulta y NO por el valor: lo
            // tecleado nunca es el valor, y el valor se dibuja encima del input
            // (ver `ComboboxFieldTrigger`). Base UI intentaría llenar el input
            // con el item elegido; esa razón vuelve la consulta a vacío.
            inputValue={query}
            onInputValueChange={(next, details) => {
              setQuery(TYPING_REASONS.has(details.reason) ? next : "")
              onInputValueChange?.(next, details)
            }}
            onOpenChange={(open, details) => {
              // Al cerrar se descarta lo tecleado: si no se eligió opción, el
              // campo vuelve a mostrar el valor que ya tenía.
              if (!open) setQuery("")
              onOpenChange?.(open, details)
            }}
            {...props}
          >
            {children}
          </ComboboxPrimitive.Root>
        </ComboboxFilterContext.Provider>
      </ComboboxAnchorContext.Provider>
    </ComboboxItemsContext.Provider>
  )
}

function ComboboxFieldValue({
  className,
  // Texto por defecto de TODOS los campos sin valor. Se define acá y no en cada
  // formulario para que el vacío se lea igual en toda la app; pasar
  // `placeholder` sigue funcionando para los casos con semántica propia (los
  // filtros usan "Todos", porque ahí vacío significa "sin filtro").
  placeholder = "Seleccionar",
  children,
  ...props
}: ComboboxPrimitive.Value.Props & { className?: string }) {
  const items = React.useContext(ComboboxItemsContext)

  // Si la raíz recibió `items`, lo usamos como lookup y descartamos `children`
  // — coexistirían en el render y el `children` ganaría siempre que sea
  // función, dejando al `items` como una promesa vacía. El fallback al
  // `placeholder` cubre el valor ausente (`null`) y también el que no está en
  // el mapa: sin él, el campo quedaba literalmente en blanco.
  const renderChildren = items
    ? (value: unknown) =>
        (value === null || value === undefined ? null : items[String(value)]) ?? placeholder
    : children

  // block (no flex): el text-overflow no aplica al contenido anónimo de un flex
  // container, así que con display:flex el "…" nunca se dibuja. min-w-0 es lo
  // que deja al valor encogerse por debajo del ancho de su contenido.
  return (
    <span
      data-slot="combobox-field-value"
      className={cn("block min-w-0 flex-1 truncate", className)}
    >
      <ComboboxPrimitive.Value placeholder={placeholder} {...props}>
        {renderChildren}
      </ComboboxPrimitive.Value>
    </span>
  )
}

/**
 * Padding del valor dibujado encima del input. Tiene que ser el mismo que el
 * del recuadro (`inputVariants`) para que el texto del valor caiga exactamente
 * donde después aparece el cursor: la capa es `absolute inset-0`, o sea que
 * mide la caja de padding del campo y hay que reponer ese padding a mano.
 */
const comboboxOverlayVariants = cva("absolute inset-0 flex items-center pr-7", {
  variants: {
    variant: {
      standard: "px-0 py-2",
      outlined: "px-3 py-2",
      filled: "px-3 pt-6 pb-2",
    },
  },
  defaultVariants: { variant: "standard" },
})

/**
 * El borde tiene que encenderse con el foco del `<input>` de adentro, no del
 * contenedor: `focus-visible:` de `inputVariants` apunta al elemento enfocado y
 * acá el enfocable es hijo, así que se repone con `focus-within:`.
 */
const comboboxFocusVariants = cva("", {
  variants: {
    variant: {
      standard: "focus-within:border-b-ring",
      outlined:
        "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 aria-invalid:focus-within:border-red aria-invalid:focus-within:ring-red/20",
      filled: "focus-within:border-b-ring focus-within:bg-muted/50",
    },
  },
  defaultVariants: { variant: "standard" },
})

/**
 * El campo: un recuadro con forma de input que contiene el `<input>` real del
 * combobox, el valor seleccionado dibujado encima (mientras no se escribe) y el
 * botón del caret.
 */
function ComboboxFieldTrigger({
  className,
  size = "default",
  variant,
  children,
  disabled,
  id,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel,
  ...props
}: Omit<ComboboxPrimitive.Input.Props, "size"> & {
  size?: "sm" | "default"
  variant?: InputVariant
}) {
  const resolvedVariant = useInputVariant(variant)
  const anchorRef = React.useContext(ComboboxAnchorContext)
  const { query } = React.useContext(ComboboxFilterContext)
  // El valor vive en una capa aparte, no en el `value` del input, así que hay
  // que enlazarlo a mano para que un lector de pantalla lo anuncie.
  const valueId = React.useId()

  return (
    <div
      ref={anchorRef}
      data-slot="combobox-field-trigger"
      data-size={size}
      aria-invalid={ariaInvalid}
      className={cn(
        inputVariants({ variant: resolvedVariant, size }),
        inputTriggerVariants({ variant: resolvedVariant }),
        comboboxFocusVariants({ variant: resolvedVariant }),
        // cursor-text pisa el `cursor-pointer` del trigger: acá se escribe.
        "relative flex cursor-text items-center gap-1.5 has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50",
        className,
      )}
    >
      <ComboboxPrimitive.Input
        id={id}
        disabled={disabled}
        aria-invalid={ariaInvalid}
        aria-label={ariaLabel}
        aria-describedby={valueId}
        // El input hereda el alto y el padding del recuadro, así que va sin caja
        // propia: solo ocupa el espacio y aporta el cursor.
        className="min-w-0 flex-1 bg-transparent text-sm outline-none disabled:cursor-not-allowed"
        {...props}
      />
      {/*
        El caret va ANTES del valor en el DOM aunque se vea después
        (`order-last`) porque expone `data-placeholder` cuando no hay valor
        elegido, y el selector `peer-*` de Tailwind solo mira hermanos
        posteriores. Es lo que pinta el placeholder en gris.
      */}
      <ComboboxPrimitive.Trigger
        disabled={disabled}
        tabIndex={-1}
        aria-label="Mostrar opciones"
        className="peer/caret order-last -mr-1 flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground"
      >
        <CaretDownIcon className="pointer-events-none size-3.5" />
      </ComboboxPrimitive.Trigger>
      {/*
        Mientras no se escribe, el valor tapa al input; al primer carácter se
        desmonta y queda a la vista lo tecleado. `pointer-events-none` para que
        el clic siga llegando al input de abajo.
      */}
      {query === "" && (
        <span
          id={valueId}
          className={cn(
            comboboxOverlayVariants({ variant: resolvedVariant }),
            "pointer-events-none peer-data-[placeholder]/caret:text-muted-foreground",
          )}
        >
          {children}
        </span>
      )}
    </div>
  )
}

function ComboboxFieldContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  anchor,
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<
    ComboboxPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "anchor"
  >) {
  const anchorRef = React.useContext(ComboboxAnchorContext)
  const { query, visibleCount } = React.useContext(ComboboxFilterContext)

  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        // El ancla es el recuadro del campo: con el default el popup se colgaría
        // del `<input>` o del caret y quedaría angosto y corrido.
        anchor={anchor ?? anchorRef ?? undefined}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-field-content"
          className={cn(
            // flex-col + overflow-hidden y NO overflow-y-auto: el scroll vive en
            // la `List`, no acá. Si el popup es el scroller, la capa de vidrio
            // (`before:inset-0`) mide solo el alto visible y se desplaza con el
            // contenido, así que al bajar la lista el fondo blureado desaparece
            // y el `bg-popover/70` deja ver la página de atrás.
            "isolate z-50 flex max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) flex-col overflow-hidden rounded-lg text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 animate-none! relative bg-popover/70 before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:rounded-[inherit] before:backdrop-blur-2xl before:backdrop-saturate-150 **:data-[slot$=-separator]:bg-foreground/5 **:data-[slot$=-trigger]:focus:bg-foreground/10 **:data-[slot$=-trigger]:aria-expanded:bg-foreground/10! **:data-[variant=destructive]:focus:bg-foreground/10! **:data-[variant=destructive]:text-accent-foreground! **:data-[variant=destructive]:**:text-accent-foreground!",
            className,
          )}
          {...props}
        >
          <ComboboxPrimitive.List className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-1.5">
            {children}
          </ComboboxPrimitive.List>
          {/*
            El vacío es nuestro y no `Combobox.Empty`: ese se apoya en el filtro
            interno de Base UI, que acá está apagado porque los items los pinta
            cada formulario a mano.
          */}
          {query !== "" && visibleCount === 0 && (
            <div
              data-slot="combobox-field-empty"
              className="px-3 py-4 text-center text-sm text-muted-foreground"
            >
              Sin resultados
            </div>
          )}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  )
}

function ComboboxFieldItem({ className, children, value, ...props }: ComboboxPrimitive.Item.Props) {
  const { query, register } = React.useContext(ComboboxFilterContext)
  const id = React.useId()

  // El valor entra en la búsqueda además del label: muchas listas se conocen por
  // su código (DANE, NIT) y ese código no siempre está en el texto visible.
  const haystack =
    typeof value === "string" || typeof value === "number"
      ? `${nodeToText(children)} ${value}`
      : nodeToText(children)
  const visible = query === "" || matchesQuery(haystack, query)

  React.useEffect(() => {
    register(id, visible)
    return () => register(id, false)
  }, [register, id, visible])

  if (!visible) return null

  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-field-item"
      value={value}
      className={cn(
        "group/combobox-field-item relative flex w-full cursor-pointer items-center gap-2.5 rounded-md py-2 pr-8 pl-3 text-sm transition-colors outline-hidden select-none data-highlighted:bg-secondary-22 data-highlighted:text-foreground not-data-[variant=destructive]:data-highlighted:**:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        className,
      )}
      {...props}
    >
      {/*
        block + min-w-0 en vez de flex: el text-overflow no aplica al contenido
        anónimo de un flex container, así que con display:flex la opción larga se
        cortaba a mitad de letra en lugar de terminar en "…". El pr-8 del item
        reserva el lugar del check, así que el "…" nunca se le encima.
      */}
      <span className="block min-w-0 flex-1 truncate">{children}</span>
      <ComboboxPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  )
}

export {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
}
