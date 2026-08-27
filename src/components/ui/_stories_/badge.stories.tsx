import preview from "../../../../.storybook/preview"
import {
  ArrowRightIcon,
  CheckCircleIcon,
  SpinnerIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@/components/ui/icons"

import { Badge, badgeVariants } from "@/components/ui/badge"

// Truco para escribir backticks literales dentro de un template literal sin
// que JS los desactive. Ver button.stories.tsx para más contexto.
const BT = "`"

const meta = preview.meta({
  title: "Design System/Data Display/Badge",
  component: Badge,
  // Sin `tags: ['autodocs']` — la docs page la genera `badge.mdx`.
  args: { children: "Badge" },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["fill", "soft", "outline"],
      description: "Forma del Badge (sincronizada con Figma: Solid/Soft/Outline).",
      table: { defaultValue: { summary: "fill" } },
    },
    color: {
      control: { type: "select" },
      options: [
        "primary",
        "secondary",
        "muted",
        "neutral",
        "destructive",
        "info",
        "warning",
        "success",
      ],
      description: "Tono semántico (8 colores, mapeo Figma → código en `badge.tsx`).",
      table: { defaultValue: { summary: "primary" } },
    },
  },
  parameters: {
    docs: {
      description: {
        component: `

# Badge

Etiqueta compacta para representar **estado**, **categoría** o **conteo**.
Es visual, no interactiva — si necesitás que algo sea clicable, usa
**${BT}Button variant="soft"${BT}** en su lugar.

Combina **${BT}variant${BT}** (forma) con **${BT}color${BT}** (tono semántico)
para dar **3 × 8 = 24 combinaciones** sincronizadas con Figma
*"Design Tokens — Tailwind Sync"*.

Construido sobre ${BT}@base-ui/react/use-render${BT} — soporta ${BT}render${BT} para
montar como ${BT}<a>${BT}, ${BT}<button>${BT}, etc. preservando accesibilidad.

---

## Cuándo usar

- **Estado de un registro** → ${BT}variant="soft"${BT} con color semántico (Publicado, Rechazado, Pendiente, Borrador…).
- **Categoría o taxonomía** → ${BT}variant="outline"${BT} (Front-end, Backend, Diseño…).
- **Conteo o tag numérico** → ${BT}variant="fill"${BT} con número.
- **Etiqueta de versión** → ${BT}variant="soft" color="muted"${BT} (${BT}v1.2.0${BT}, ${BT}beta${BT}, ${BT}internal${BT}).
- **Como enlace de filtro** → ${BT}render={<a href="?status=draft" />}${BT}.

## Cuándo **no** usar

- **Botones interactivos** → usa ${BT}<Button>${BT}. El Badge no debería ser el target de un click.
- **Notificaciones dismissibles** → usa un componente de Toast/Alert.
- **Texto largo** → el badge es para **1–3 palabras**. Si necesitás más, es un párrafo.
- **Como reemplazo de texto** → no conviertas párrafos en badges.

---

## Anatomía

${BT}${BT}${BT}
[ Ícono opcional ] [ Texto · 0.625rem · uppercase · tracking-widest ] [ Ícono opcional ]
${BT}${BT}${BT}

- Padding fijo: ${BT}px-2 py-0.5${BT}.
- Tipografía: **Label/Small** (Inter Semi Bold, 10px, letter-spacing 2px) — la misma que usa Figma.
- ${BT}rounded-none${BT} por defecto; agrega ${BT}rounded-full${BT} vía ${BT}className${BT} si necesitás una píldora.

---

## Accesibilidad

- **Semántica por defecto**: ${BT}<span>${BT} — no tiene rol interactivo. Si el contenido es accionable, agrega ${BT}render={<a/>}${BT} o ${BT}render={<button/>}${BT}.
- **Color no es suficiente**: el badge transmite estado **también con texto**. Ej. ${BT}<Badge color="success">Activo</Badge>${BT}, no solo un punto verde.
- **Contraste**: las variantes ${BT}fill${BT} y ${BT}soft${BT} con ${BT}color="muted"${BT} tienen contraste bajo por diseño (≤1.2:1 vs fondo). Reservá muted para casos donde el texto ya se explique solo.
- **Íconos**: si el ícono carga significado (✓ / ✗ / !), pasá ${BT}aria-hidden="true"${BT} al ${BT}<span data-icon>${BT} y dejá que el texto del badge comunique el estado.

---

## Decisiones de diseño

- **Sin variantes ${BT}ghost${BT} ni ${BT}link${BT}** — el Badge es visual, no interactivo. Si necesitás esos comportamientos, usa Button.
- **${BT}badgeVariants${BT}** exportado para extender componentes no-Badge (ej. un ${BT}<Tag>${BT} que herede estilo).

---

## API

La tabla de props se autogenera desde los tipos de TypeScript.
`,
      },
    },
  },
})

export default meta

/**
 * **Playground** — interactúa con los controles para explorar las 24 combinaciones
 * de `variant × color`. Esta story también es la documentación autogenerada.
 */
export const Default = meta.story({})

/**
 * Matriz completa de **3 variants × 8 colores** (24 combinaciones). Útil para
 * revisar de un vistazo la jerarquía tonal en cada tema.
 */
export const Variants = meta.story({
  parameters: {
    // El `render` ya enumera las 24 combinaciones — los controles de
    // variant/color son redundantes aquí.
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Las filas son `variant`, las columnas son `color`. Cada celda es un `<Badge>` real.",
      },
      source: {
        code: `<Badge variant="fill" color="primary">Badge</Badge>`,
      },
    },
  },
  render: () => {
    const variants = ["fill", "soft", "outline"] as const
    const colors = [
      "primary",
      "secondary",
      "muted",
      "neutral",
      "info",
      "destructive",
      "warning",
      "success",
    ] as const
    return (
      <div className="flex flex-col gap-6 p-6">
        {variants.map((variant) => (
          <div key={variant} className="flex flex-col gap-2">
            <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              {variant}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {colors.map((color) => (
                <Badge key={color} variant={variant} color={color}>
                  Badge
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  },
})

/**
 * **Badge con ícono** — soporta íconos a la izquierda y derecha vía `data-icon`.
 * Patrón recomendado para badges de estado (success/destructive/warning/info).
 */
export const WithIcon = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'Envuelve el ícono en `<span data-icon="inline-start">` o `inline-end` para heredar el color del badge.',
      },
      source: {
        code: `<Badge variant="soft" color="success">
  <CheckCircleIcon weight="fill" data-icon="inline-start" />
  Activo
</Badge>

<Badge variant="soft" color="destructive">
  <XCircleIcon weight="fill" data-icon="inline-start" />
  Rechazado
</Badge>

<Badge variant="soft" color="warning">
  <WarningCircleIcon weight="fill" data-icon="inline-start" />
  Pendiente
</Badge>

<Badge variant="soft" color="info">
  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
  Procesando
</Badge>`,
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-2 p-6">
      <Badge variant="soft" color="success">
        <span data-icon="inline-start">
          <CheckCircleIcon weight="fill" />
        </span>
        Activo
      </Badge>
      <Badge variant="soft" color="destructive">
        <span data-icon="inline-start">
          <XCircleIcon weight="fill" />
        </span>
        Rechazado
      </Badge>
      <Badge variant="soft" color="warning">
        <span data-icon="inline-start">
          <WarningCircleIcon weight="fill" />
        </span>
        Pendiente
      </Badge>
      <Badge variant="soft" color="info">
        <span data-icon="inline-start">
          <SpinnerIcon className="animate-spin" />
        </span>
        Procesando
      </Badge>
    </div>
  ),
})

/**
 * **Badge como enlace.** Usa `render={<a href="..." />}` para que el badge
 * funcione como anchor sin perder la apariencia.
 */
export const AsLink = meta.story({
  args: {
    render: <a href="#" />,
    children: "Ver detalles",
    variant: "soft",
    color: "info",
  },
  parameters: {
    // El ejemplo está fijo (variant=soft, color=info) — los controles no aplican.
    controls: { disable: true },
    docs: {
      description: {
        story:
          "`render` viene de `@storybook/blocks/use-render`. Mantiene la accesibilidad del `<a>` con la apariencia del badge.",
      },
      source: {
        code: `<Badge
  render={<a href="?status=draft" />}
  variant="soft"
  color="info"
>
  Ver detalles
</Badge>`,
      },
    },
  },
})

/**
 * **Casos reales** — badges típicos en un producto. Combina color semántico con
 * ícono para reforzar el significado (no solo el color, que es problemático
 * para usuarios daltónicos).
 */
export const StatusBadges = meta.story({
  parameters: {
    // El `render` ya define cada combinación recomendada — los controles
    // no agregan valor (cambiar variant/color rompe la semántica del estado).
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Estos son los patrones que recomendamos. El color comunica la categoría semántica; el ícono refuerza el mensaje.",
      },
      source: {
        code: `<Badge variant="fill" color="success">Publicado</Badge>
<Badge variant="soft" color="success">Activo</Badge>
<Badge variant="outline" color="success">Aprobado</Badge>

<Badge variant="fill" color="destructive">Eliminado</Badge>
<Badge variant="soft" color="destructive">Rechazado</Badge>

<Badge variant="soft" color="warning">Pendiente</Badge>
<Badge variant="soft" color="info">Borrador</Badge>

<Badge variant="soft" color="muted">v1.2.0</Badge>
<Badge variant="outline" color="neutral">Interno</Badge>`,
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-3 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="fill" color="success">
          Publicado
        </Badge>
        <Badge variant="soft" color="success">
          Activo
        </Badge>
        <Badge variant="outline" color="success">
          Aprobado
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="fill" color="destructive">
          Eliminado
        </Badge>
        <Badge variant="soft" color="destructive">
          Rechazado
        </Badge>
        <Badge variant="outline" color="destructive">
          Vencido
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="fill" color="warning">
          En revisión
        </Badge>
        <Badge variant="soft" color="warning">
          Pendiente
        </Badge>
        <Badge variant="outline" color="warning">
          Por vencer
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="fill" color="info">
          Nuevo
        </Badge>
        <Badge variant="soft" color="info">
          Borrador
        </Badge>
        <Badge variant="outline" color="info">
          Archivado
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="soft" color="muted">
          v1.2.0
        </Badge>
        <Badge variant="outline" color="neutral">
          Interno
        </Badge>
      </div>
    </div>
  ),
})

/**
 * **Personalización de color** vía `className`. Útil para un caso puntual sin
 * agregar un color al design system. `badgeVariants` también se puede aplicar a
 * un elemento que no sea `<Badge>`.
 */
export const CustomColors = meta.story({
  parameters: {
    // El `render` define los colores custom — los controles no aplican.
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Pasa clases de Tailwind directamente. Úsalo con moderación — preferir agregar un color al design system si el caso es recurrente.",
      },
      source: {
        code: `<Badge className="bg-purple-600 text-white">Purple</Badge>

<Badge variant="outline" className="border-purple-600 text-purple-600">
  Purple outline
</Badge>

<a href="#" className={badgeVariants({ variant: 'fill', color: 'primary' })}>
  badgeVariants en <a>
</a>`,
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-2 p-6">
      <Badge className="bg-purple-600 text-white">Purple</Badge>
      <Badge className="bg-pink-600 text-white">Pink</Badge>
      <Badge variant="outline" className="border-purple-600 text-purple-600">
        Purple outline
      </Badge>
      <a href="#" className={badgeVariants({ variant: "fill", color: "primary" })}>
        badgeVariants en &lt;a&gt;
      </a>
      <Badge variant="soft" color="info">
        Ver más
        <span data-icon="inline-end">
          <ArrowRightIcon />
        </span>
      </Badge>
    </div>
  ),
})
