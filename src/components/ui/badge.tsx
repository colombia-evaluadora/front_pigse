import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

// Dos ejes independientes: `variant` es la forma (fill/soft/outline),
// `color` es el tono semántico. Antes vivían mezclados en un solo enum
// ("destructive", "outline", "secondary"...), lo que obligaba a simular
// combinaciones (ej. "outline" + color destructivo) pisando className a mano.
//
// Sincronizado con Figma "Design Tokens — Tailwind Sync" (Badge):
//   - 9 colores: Primary · Secondary · Muted · Neutral · Blue · Red · Yellow · Orange · Green
//   - 3 variantes: Solid (fill) · Soft · Outline
// Los nombres `fill / outline` se conservan por compatibilidad con la API
// existente; `fill` ⇄ Solid y `outline` ⇄ Outline del Figma.
const badgeVariants = cva(
  "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-xs border border-transparent px-2 py-0.5 text-[0.625rem] font-semibold tracking-widest whitespace-nowrap uppercase transition-colors has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 focus-visible:border-ring focus-visible:ring-[3px] aria-invalid:border-red aria-invalid:ring-red/20 dark:aria-invalid:ring-red/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        // Solid en Figma
        fill: "",
        // Soft en Figma: bg-X-22 + texto del color, SIN borde (el `border` de la
        // base queda transparente y solo reserva el mismo 1px que las otras
        // variantes, para que no cambie el alto entre una y otra).
        soft: "",
        // Outline en Figma: border-X-stroke + texto del color (sin fondo)
        outline: "",
      },
      color: {
        primary: "",
        secondary: "",
        muted: "",
        neutral: "",
        destructive: "",
        info: "",
        warning: "",
        orange: "",
        success: "",
      },
    },
    compoundVariants: [
      // ============ fill (Solid en Figma) ============
      {
        variant: "fill",
        color: "primary",
        class:
          "bg-primary text-primary-foreground [a]:hover:bg-primary/80 focus-visible:ring-ring/50",
      },
      {
        variant: "fill",
        color: "muted",
        class: "bg-muted text-muted-foreground [a]:hover:bg-muted/70 focus-visible:ring-ring/50",
      },
      {
        variant: "fill",
        color: "secondary",
        class:
          "bg-secondary text-secondary-foreground [a]:hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] focus-visible:ring-ring/50",
      },
      {
        variant: "fill",
        color: "neutral",
        class:
          "bg-foreground text-background [a]:hover:bg-foreground/80 focus-visible:ring-ring/50",
      },
      {
        variant: "fill",
        color: "destructive",
        class: "bg-red text-red-foreground [a]:hover:bg-red/80 focus-visible:ring-red/20",
      },
      {
        variant: "fill",
        color: "info",
        class: "bg-blue text-blue-foreground [a]:hover:bg-blue/80 focus-visible:ring-blue/20",
      },
      {
        variant: "fill",
        color: "warning",
        class:
          "bg-yellow text-yellow-foreground [a]:hover:bg-yellow/80 focus-visible:ring-yellow/20",
      },
      {
        variant: "fill",
        color: "orange",
        class:
          "bg-orange text-orange-foreground [a]:hover:bg-orange/80 focus-visible:ring-orange/20",
      },
      {
        variant: "fill",
        color: "success",
        class: "bg-green text-green-foreground [a]:hover:bg-green/80 focus-visible:ring-green/20",
      },

      // ============ soft (Soft en Figma) ============
      {
        variant: "soft",
        color: "primary",
        class: "bg-primary-22 text-primary [a]:hover:bg-primary/30 focus-visible:ring-primary/20",
      },
      {
        variant: "soft",
        color: "secondary",
        class:
          "bg-secondary-22 text-secondary [a]:hover:bg-secondary/30 focus-visible:ring-ring/30",
      },
      {
        variant: "soft",
        color: "muted",
        class: "bg-muted-22 text-muted-foreground [a]:hover:bg-muted/40 focus-visible:ring-ring/30",
      },
      {
        variant: "soft",
        color: "neutral",
        class:
          "bg-foreground-22 text-foreground [a]:hover:bg-foreground/30 focus-visible:ring-foreground/20",
      },
      {
        variant: "soft",
        color: "destructive",
        class: "bg-red-22 text-red [a]:hover:bg-red/30 focus-visible:ring-red/20",
      },
      {
        variant: "soft",
        color: "info",
        class: "bg-blue-22 text-blue [a]:hover:bg-blue/30 focus-visible:ring-blue/20",
      },
      {
        variant: "soft",
        color: "warning",
        class: "bg-yellow-22 text-yellow [a]:hover:bg-yellow/30 focus-visible:ring-yellow/20",
      },
      {
        variant: "soft",
        color: "orange",
        class: "bg-orange-22 text-orange [a]:hover:bg-orange/30 focus-visible:ring-orange/20",
      },
      {
        variant: "soft",
        color: "success",
        class: "bg-green-22 text-green [a]:hover:bg-green/30 focus-visible:ring-green/20",
      },

      // ============ outline (Outline en Figma) ============
      {
        variant: "outline",
        color: "primary",
        class:
          "border-primary-stroke text-primary [a]:hover:bg-primary/10 focus-visible:ring-primary/20",
      },
      {
        variant: "outline",
        color: "muted",
        class:
          "border-border text-muted-foreground [a]:hover:bg-muted hover:text-foreground focus-visible:ring-ring/50",
      },
      {
        variant: "outline",
        color: "secondary",
        class:
          "border-secondary-stroke text-secondary [a]:hover:bg-secondary/10 focus-visible:ring-ring/30",
      },
      {
        variant: "outline",
        color: "neutral",
        class:
          "border-foreground-stroke text-foreground [a]:hover:bg-foreground/10 focus-visible:ring-foreground/20",
      },
      {
        variant: "outline",
        color: "destructive",
        class: "border-red-stroke text-red [a]:hover:bg-red/10 focus-visible:ring-red/20",
      },
      {
        variant: "outline",
        color: "info",
        class: "border-blue-stroke text-blue [a]:hover:bg-blue/10 focus-visible:ring-blue/20",
      },
      {
        variant: "outline",
        color: "warning",
        class:
          "border-yellow-stroke text-yellow [a]:hover:bg-yellow/10 focus-visible:ring-yellow/20",
      },
      {
        variant: "outline",
        color: "orange",
        class:
          "border-orange-stroke text-orange [a]:hover:bg-orange/10 focus-visible:ring-orange/20",
      },
      {
        variant: "outline",
        color: "success",
        class: "border-green-stroke text-green [a]:hover:bg-green/10 focus-visible:ring-green/20",
      },
    ],
    defaultVariants: {
      variant: "fill",
      color: "primary",
    },
  },
)

/**
 * Etiqueta compacta para representar estado, categoría o conteo.
 *
 * Combina `variant` (forma: fill / soft / outline) con `color` (tono
 * semántico: 8 colores) para dar 24 combinaciones sincronizadas con
 * Figma "Design Tokens — Tailwind Sync".
 *
 * Construido sobre `@base-ui/react/use-render` — soporta `render` para
 * montar como `<a>`, `<button>`, etc. preservando accesibilidad.
 *
 * Los íconos van como hijos con `data-icon="inline-start" | "inline-end"`, igual
 * que en Button: el atributo compensa el padding de ese lado.
 *
 * @example
 *   <Badge variant="soft" color="success">Activo</Badge>
 *   <Badge variant="outline" color="warning">Pendiente</Badge>
 *   <Badge render={<a href="?status=draft" />}>Borrador</Badge>
 *   <Badge color="info"><ClockIcon data-icon="inline-start" />En revisión</Badge>
 */
function Badge({
  className,
  variant = "fill",
  color = "primary",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant, color }), className),
      },
      props,
    ),
    render,
    state: {
      slot: "badge",
      variant,
      color,
    },
  })
}

export { Badge, badgeVariants }
