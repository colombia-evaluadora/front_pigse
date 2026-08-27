import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"
import { createContext, useContext, useEffect, useRef, useState } from "react"

import { cn } from "@/lib/utils"

// La lista avisa al root cuando las pestañas llegan a ocupar todo el ancho. El
// root lo publica como `data-tabs-filled` para que el panel pueda quitar el
// radio de su esquina superior derecha y fundirse con la última pestaña.
const TabsFilledContext = createContext<((filled: boolean) => void) | null>(null)

function Tabs({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) {
  const [filled, setFilled] = useState(false)

  return (
    <TabsFilledContext.Provider value={setFilled}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        data-tabs-filled={filled ? "true" : undefined}
        className={cn("group/tabs flex gap-2 data-horizontal:flex-col", className)}
        {...props}
      />
    </TabsFilledContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center p-1 text-muted-foreground group-data-horizontal/tabs:h-10 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
        // Pestañas tipo carpeta. La lista es dueña del marco exterior (borde
        // superior + laterales) y del redondeo, que recorta a las hijas para que
        // la primera y la última salgan curvas. El borde inferior lo dibuja cada
        // pestaña, para que la activa pueda borrarlo y fundirse con el panel.
        // El margen negativo cancela el gap-2 del root y monta 1px más, para que
        // la lista se apoye justo encima del borde superior del panel: donde hay
        // pestaña inactiva las dos líneas coinciden, y la activa lo tapa con su
        // fondo (z-10). Así el panel puede llevar su borde completo y no queda
        // hueco blanco a la derecha de la última pestaña.
        // La lista mide lo que miden sus pestañas (w-fit) y solo se limita al
        // ancho del contenedor (max-w-full) para que, si no caben, entren en
        // juego el truncado y el flex-none de la activa.
        folder:
          "relative z-10 mb-[calc(-0.5rem-1px)] w-fit max-w-full flex-nowrap items-stretch justify-start gap-0 overflow-hidden rounded-t-lg border border-b-0 border-border bg-transparent p-0 group-data-horizontal/tabs:h-auto",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function TabsList({
  className,
  variant = "default",
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const setFilled = useContext(TabsFilledContext)
  const listRef = useRef<HTMLDivElement>(null)

  // Solo la variante folder necesita saberlo: es la única que dibuja marco.
  useEffect(() => {
    if (variant !== "folder" || !setFilled) return

    const list = listRef.current
    const root = list?.parentElement
    if (!list || !root) return

    // 1px de tolerancia por los anchos fraccionarios del zoom del navegador.
    const update = () => setFilled(list.offsetWidth >= root.clientWidth - 1)
    update()

    const observer = new ResizeObserver(update)
    observer.observe(list)
    observer.observe(root)
    return () => {
      observer.disconnect()
      setFilled(false)
    }
  }, [variant, setFilled])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 border border-transparent px-4 py-1.5 text-xs font-semibold tracking-wider whitespace-nowrap text-foreground/60 uppercase transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:px-4 group-data-vertical/tabs:py-2 hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 aria-disabled:pointer-events-none aria-disabled:opacity-50 dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        // Cada pestaña dibuja solo dos líneas: el separador izquierdo (salvo la
        // primera) y el borde inferior contra el panel. El marco exterior es de la
        // lista, así ninguna línea se duplica ni queda un lado sin cerrar.
        "group-data-[variant=folder]/tabs-list:h-auto group-data-[variant=folder]/tabs-list:rounded-none group-data-[variant=folder]/tabs-list:border-0 group-data-[variant=folder]/tabs-list:border-b group-data-[variant=folder]/tabs-list:border-l group-data-[variant=folder]/tabs-list:first:border-l-0 group-data-[variant=folder]/tabs-list:border-border group-data-[variant=folder]/tabs-list:bg-muted/60 group-data-[variant=folder]/tabs-list:px-4 group-data-[variant=folder]/tabs-list:py-2.5 group-data-[variant=folder]/tabs-list:text-xs group-data-[variant=folder]/tabs-list:tracking-normal group-data-[variant=folder]/tabs-list:normal-case",
        // Las inactivas miden lo que mide su etiqueta (flex-initial: no crecen,
        // sí encogen) y recortan con "…" si falta espacio; la activa pasa a
        // flex-none para reservar su ancho completo y mostrar siempre la
        // etiqueta entera.
        // El display block es lo que habilita el text-ellipsis (en un flex no aplica).
        "group-data-[variant=folder]/tabs-list:block group-data-[variant=folder]/tabs-list:min-w-16 group-data-[variant=folder]/tabs-list:flex-initial group-data-[variant=folder]/tabs-list:truncate group-data-[variant=folder]/tabs-list:text-center",
        // La activa borra su borde inferior para fundirse con el panel (que va sin
        // borde superior) y queda en blanco.
        "group-data-[variant=folder]/tabs-list:data-active:flex-none group-data-[variant=folder]/tabs-list:data-active:border-b-transparent group-data-[variant=folder]/tabs-list:data-active:bg-background dark:group-data-[variant=folder]/tabs-list:data-active:border-b-transparent dark:group-data-[variant=folder]/tabs-list:data-active:bg-background",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
