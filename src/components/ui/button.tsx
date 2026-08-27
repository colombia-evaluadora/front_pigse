import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Dos ejes independientes: `variant` es la forma (fill/soft/outline/ghost/link),
// `color` es el tono semántico. Mismo desacople que en Badge — evita simular
// combinaciones (ej. "outline" + tono destructivo) pisando className a mano.
// `ghost` y `link` ignoran `color` para algunos tonos secundarios, igual que en Badge.
//
// Sincronizado con Figma "Design Tokens — Tailwind Sync" (Button):
//   - 8 colores: Primary · Secondary · Muted · Neutral · Blue · Red · Yellow · Green
//   - 5 variantes: Solid (fill) · Soft · Outline · Ghost · Link
//   - 4 sizes: sm · md · lg · icon (en Figma); aquí conservamos también xs/icon-xs/icon-sm/icon-lg
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent bg-clip-padding text-xs font-semibold tracking-widest whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-red aria-invalid:ring-2 aria-invalid:ring-red/20 dark:aria-invalid:border-red/50 dark:aria-invalid:ring-red/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        // Solid en Figma
        fill: "bg-primary text-primary-foreground",
        // Soft en Figma: bg-X-22 + border-X-stroke + texto del color
        soft: "",
        // Outline en Figma: border-X-stroke + texto del color (sin fondo)
        outline: "bg-transparent",
        // Ghost en Figma: solo texto del color, hover bg-X/10
        ghost: "bg-transparent",
        // Link en Figma: texto del color + underline
        link: "bg-transparent !p-0 underline underline-offset-4 hover:underline",
      },
      color: {
        primary: "",
        secondary: "",
        muted: "",
        neutral: "",
        destructive: "",
        info: "",
        warning: "",
        success: "",
      },
      size: {
        default:
          "h-11 gap-1.5 px-6 has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        xs: "h-7 gap-1 px-3 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-10 gap-1 px-4 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        lg: "h-12 gap-1.5 px-8 has-data-[icon=inline-end]:pr-5 has-data-[icon=inline-start]:pl-5",
        icon: "size-11",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3",
        // El glifo va a size-5 y no al size-3.5 de la base: es el tamaño de los
        // botones de acción (editar/eliminar) de las filas de tabla, donde el
        // icono ES el control —no acompaña a un texto— y a 14px no se leía.
        // Repite el `:not([class*='size-'])` de la base a propósito: con un
        // `[&_svg]:size-5` a secas pierde por especificidad y no aplica nada.
        "icon-sm": "size-10 [&_svg:not([class*='size-'])]:size-5",
        "icon-lg": "size-12",
      },
    },
    compoundVariants: [
      // ============ fill (Solid en Figma) ============
      {
        variant: "fill",
        color: "primary",
        class: "bg-primary text-primary-foreground hover:bg-primary/90 aria-expanded:bg-primary",
      },
      {
        variant: "fill",
        color: "secondary",
        class:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
      },
      {
        variant: "fill",
        color: "muted",
        class: "bg-muted text-muted-foreground hover:bg-muted/70 aria-expanded:bg-muted",
      },
      {
        variant: "fill",
        color: "neutral",
        class:
          "bg-foreground text-background hover:bg-foreground/90 aria-expanded:bg-foreground aria-expanded:text-background",
      },
      {
        variant: "fill",
        color: "info",
        class:
          "bg-blue text-blue-foreground hover:bg-blue/90 aria-expanded:bg-blue focus-visible:border-blue/40 focus-visible:ring-blue/20",
      },
      {
        variant: "fill",
        color: "destructive",
        class:
          "bg-red text-red-foreground hover:bg-red/90 aria-expanded:bg-red focus-visible:border-red/40 focus-visible:ring-red/20",
      },
      {
        variant: "fill",
        color: "warning",
        class:
          "bg-yellow text-yellow-foreground hover:bg-yellow/90 aria-expanded:bg-yellow focus-visible:border-yellow/40 focus-visible:ring-yellow/20",
      },
      {
        variant: "fill",
        color: "success",
        class:
          "bg-green text-green-foreground hover:bg-green/90 aria-expanded:bg-green focus-visible:border-green/40 focus-visible:ring-green/20",
      },

      // ============ soft (Soft en Figma) ============
      {
        variant: "soft",
        color: "primary",
        class:
          "border-primary-stroke bg-primary-22 text-primary hover:bg-primary/20 aria-expanded:bg-primary/20 focus-visible:ring-primary/20",
      },
      {
        variant: "soft",
        color: "secondary",
        class:
          "border-secondary-stroke bg-secondary-22 text-secondary hover:bg-secondary/20 aria-expanded:bg-secondary/20 focus-visible:ring-ring/30",
      },
      {
        variant: "soft",
        color: "muted",
        class:
          // Figma usa bg-muted-stroke (alpha 30%) para Soft+Muted en Button;
          // difiere de Badge (que usa bg-muted-22). Se respeta la intención del diseño.
          "border-muted-stroke bg-muted-stroke text-muted-foreground hover:bg-muted/40 aria-expanded:bg-muted-stroke",
      },
      {
        variant: "soft",
        color: "neutral",
        class:
          "border-foreground-stroke bg-foreground-22 text-foreground hover:bg-foreground/20 aria-expanded:bg-foreground/20 focus-visible:ring-foreground/20",
      },
      {
        variant: "soft",
        color: "info",
        class:
          "border-blue-stroke bg-blue-22 text-blue hover:bg-blue/20 aria-expanded:bg-blue/20 focus-visible:border-blue/40 focus-visible:ring-blue/20",
      },
      {
        variant: "soft",
        color: "destructive",
        class:
          "border-red-stroke bg-red-22 text-red hover:bg-red/20 aria-expanded:bg-red/20 focus-visible:border-red/40 focus-visible:ring-red/20",
      },
      {
        variant: "soft",
        color: "warning",
        class:
          "border-yellow-stroke bg-yellow-22 text-yellow hover:bg-yellow/20 aria-expanded:bg-yellow/20 focus-visible:border-yellow/40 focus-visible:ring-yellow/20",
      },
      {
        variant: "soft",
        color: "success",
        class:
          "border-green-stroke bg-green-22 text-green hover:bg-green/20 aria-expanded:bg-green/20 focus-visible:border-green/40 focus-visible:ring-green/20",
      },

      // ============ outline (Outline en Figma) ============
      {
        variant: "outline",
        color: "primary",
        class:
          "border-primary-stroke text-primary hover:bg-primary/10 hover:text-primary aria-expanded:text-primary focus-visible:ring-primary/20",
      },
      {
        variant: "outline",
        color: "secondary",
        class:
          "border-secondary-stroke text-secondary hover:bg-secondary/10 aria-expanded:text-secondary focus-visible:ring-ring/30",
      },
      {
        variant: "outline",
        color: "muted",
        class:
          "border-border text-muted-foreground hover:bg-muted hover:text-muted-foreground aria-expanded:text-muted-foreground focus-visible:ring-ring/30",
      },
      {
        variant: "outline",
        color: "neutral",
        class:
          "border-foreground-stroke text-foreground hover:bg-foreground/10 aria-expanded:text-foreground focus-visible:ring-foreground/20",
      },
      {
        variant: "outline",
        color: "info",
        class:
          "border-blue-stroke text-blue hover:bg-blue/10 aria-expanded:text-blue focus-visible:ring-blue/20",
      },
      {
        variant: "outline",
        color: "destructive",
        class:
          "border-red-stroke text-red hover:bg-red/10 aria-expanded:text-red focus-visible:ring-red/20 dark:focus-visible:ring-red/40",
      },
      {
        variant: "outline",
        color: "warning",
        class:
          "border-yellow-stroke text-yellow hover:bg-yellow/10 aria-expanded:text-yellow focus-visible:ring-yellow/20",
      },
      {
        variant: "outline",
        color: "success",
        class:
          "border-green-stroke text-green hover:bg-green/10 aria-expanded:text-green focus-visible:ring-green/20",
      },

      // ============ ghost (Ghost en Figma) ============
      {
        variant: "ghost",
        color: "primary",
        class: "text-primary hover:bg-primary/10 aria-expanded:bg-primary/10",
      },
      {
        variant: "ghost",
        color: "secondary",
        class: "text-secondary hover:bg-secondary/10 aria-expanded:bg-secondary/10",
      },
      {
        variant: "ghost",
        color: "muted",
        class:
          "text-muted-foreground hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
      },
      {
        variant: "ghost",
        color: "neutral",
        class: "text-foreground hover:bg-foreground/10 aria-expanded:bg-foreground/10",
      },
      {
        variant: "ghost",
        color: "info",
        class: "text-blue hover:bg-blue/10 aria-expanded:bg-blue/10",
      },
      {
        variant: "ghost",
        color: "destructive",
        class: "text-red hover:bg-red/10 aria-expanded:bg-red/10",
      },
      {
        variant: "ghost",
        color: "warning",
        class: "text-yellow hover:bg-yellow/10 aria-expanded:bg-yellow/10",
      },
      {
        variant: "ghost",
        color: "success",
        class: "text-green hover:bg-green/10 aria-expanded:bg-green/10",
      },

      // ============ link (Link en Figma) ============
      {
        variant: "link",
        color: "primary",
        class: "text-primary",
      },
      {
        variant: "link",
        color: "secondary",
        class: "text-secondary",
      },
      {
        variant: "link",
        color: "muted",
        class: "text-muted-foreground",
      },
      {
        variant: "link",
        color: "neutral",
        class: "text-foreground",
      },
      {
        variant: "link",
        color: "info",
        class: "text-blue",
      },
      {
        variant: "link",
        color: "destructive",
        class: "text-red",
      },
      {
        variant: "link",
        color: "warning",
        class: "text-yellow",
      },
      {
        variant: "link",
        color: "success",
        class: "text-green",
      },
    ],
    defaultVariants: {
      variant: "fill",
      color: "primary",
      size: "default",
    },
  },
)

/**
 * Componente que dispara una acción o evento.
 *
 * Combina `variant` (forma: fill / soft / outline / ghost / link) con
 * `color` (tono semántico: 8 colores del design system) para dar 40
 * combinaciones sincronizadas con Figma "Design Tokens — Tailwind Sync".
 *
 * Construido sobre `@base-ui/react/button`.
 *
 * @example
 *   <Button variant="fill" color="primary">Guardar</Button>
 *   <Button variant="soft" color="info">Borrador</Button>
 *   <Button variant="ghost" color="neutral">Cancelar</Button>
 *   <Button render={<a href="/docs" />} variant="link">Ver docs</Button>
 */
function Button({
  className,
  variant = "fill",
  color = "primary",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, color, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
