import preview from "../../../../.storybook/preview"
import { ArrowRightIcon, PlusIcon, SpinnerIcon } from "@/components/ui/icons"

import { Button, buttonVariants } from "@/components/ui/button"

// Truco para escribir backticks literales dentro de un template literal sin
// que JS los desactive. Sin esto, `\`variant\`` en el source se procesa como
// `\` + `` ` `` en el string final, y CommonMark desactiva el code-span.
const BT = "`"

const meta = preview.meta({
  title: "Design System/Forms/Button",
  component: Button,
  // Sin `tags: ['autodocs']` — la docs page la genera `button.mdx`.
  args: { children: "Button" },
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["fill", "soft", "outline", "ghost", "link"],
      description: "Forma del botón (sincronizada con Figma: Solid/Soft/Outline/Ghost/Link).",
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
      description: "Tono semántico (8 colores, mapeo Figma → código en `button.tsx`).",
      table: { defaultValue: { summary: "primary" } },
    },
    size: {
      control: { type: "select" },
      options: ["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"],
      description: "Tamaño del botón.",
      table: { defaultValue: { summary: "default" } },
    },
  },
  parameters: {
    docs: {
      description: {
        component: `

# Button

Disparador de acciones. Es el componente principal para ejecutar una operación
(submit, confirmación, navegación interna, toggle, etc.).

Combina **${BT}variant${BT}** (forma) con **${BT}color${BT}** (tono semántico)
para dar **5 × 8 = 40 combinaciones** sincronizadas con Figma
*"Design Tokens — Tailwind Sync"*.

Construido sobre ${BT}@base-ui/react/button${BT}.

---

## Cuándo usar

- **Acción primaria** → ${BT}variant="fill"${BT} + ${BT}color="primary"${BT}. Una por vista, como máximo.
- **Acción secundaria** → ${BT}variant="soft"${BT} u ${BT}outline${BT}. Acompaña a la primaria.
- **Acción destructiva** → ${BT}color="destructive"${BT} con fill u outline. Etiqueta explícita ("Eliminar", no "Click aquí").
- **Bajo énfasis** → ${BT}variant="ghost"${BT} (ej. "Cancelar", "Volver").
- **Navegación in-page** → ${BT}variant="link"${BT} o ${BT}<a>${BT} con ${BT}buttonVariants${BT}.

## Cuándo **no** usar

- **Navegación entre rutas** → usa ${BT}<a>${BT} o el router. No semántices un botón para navegar.
- **Selección de opciones** → ${BT}ToggleGroup${BT}, ${BT}RadioGroup${BT}, ${BT}Select${BT}.
- **Labels largas** → el texto debe ser accionable y conciso ("Guardar", no "Haga clic aquí para guardar el formulario").

---

## Anatomía

${BT}${BT}${BT}
[ Ícono opcional ] [ Texto ] [ Ícono opcional ]
${BT}${BT}${BT}

- **Ícono izquierdo**: ${BT}<span data-icon="inline-start">${BT}
- **Ícono derecho**: ${BT}<span data-icon="inline-end">${BT}
- El padding se ajusta automáticamente vía las queries ${BT}has-data-[icon=...]${BT} de Tailwind.

---

## Accesibilidad

- **Teclado**: Enter y Space disparan el click (lo provee el primitive).
- **Focus**: el estado ${BT}focus-visible${BT} aplica ${BT}ring-2 ring-ring/30${BT}. No lo desactives.
- **Disabled**: aplica ${BT}pointer-events: none${BT} + opacidad 50%. El cursor pasa a ${BT}not-allowed${BT} (definido en ${BT}index.css${BT}).
- **Loading**: combiná ${BT}disabled${BT} + un spinner + ${BT}aria-busy="true"${BT}.
- **Ícono-only**: siempre pasá ${BT}aria-label${BT} describiendo la acción. Sin label es un agujero de a11y.
- **Como enlace**: usa ${BT}render={<a href="..." />}${BT} para mantener la semántica accesible. **No** hagas ${BT}<Button><a/></Button>${BT}.

---

## Decisiones de diseño

- **${BT}rounded-none${BT}** por defecto (sincronizado con Figma). Para esquinas redondeadas, agrega ${BT}className="rounded-full"${BT}.
- **Tipografía**: uppercase + ${BT}tracking-widest${BT} para emular la tipografía de etiqueta (Label/Small en Figma).
- **Sin icono por defecto** — agregar íconos solo cuando aportan información.

---

## API

La tabla de props se autogenera desde los tipos de TypeScript. Toca el panel **Controls** abajo para experimentar con cada combinación.
`,
      },
    },
  },
})

export default meta

/**
 * **Playground** — interactúa con los controles de abajo para ver cada
 * combinación de variant × color × size. Esta story también es la documentación
 * autogenerada: el panel "Controls" mapea 1:1 a las props del componente.
 */
export const Default = meta.story({})

/**
 * Matriz completa de **5 variants × 8 colores** (40 combinaciones).
 * Útil para revisar de un vistazo qué combinaciones tienen suficiente contraste
 * en cada tema (usa el toolbar superior para cambiar entre Light/Dark/Red Light/Red Dark).
 */
export const Variants = meta.story({
  parameters: {
    // Esta story renderiza las 40 combinaciones en su `render`, así que
    // los controles de `variant` y `color` son redundantes — el usuario
    // ya ve todo el espacio de diseño de un vistazo.
    controls: { disable: true },
    docs: {
      description: {
        story:
          "Las filas son `variant`, las columnas son `color`. Cada celda es un `<Button>` real renderizado con esa combinación.",
      },
      source: {
        code: `<Button variant="fill" color="primary">Button</Button>`,
      },
    },
  },
  render: () => {
    const variants = ["fill", "soft", "outline", "ghost", "link"] as const
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
                <Button key={color} variant={variant} color={color}>
                  Button
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  },
})

/**
 * Todos los **tamaños** disponibles. Las filas `xs / sm / default / lg` son para
 * botones con texto; `icon-*` son cuadrados para botones solo-icono.
 */
export const Sizes = meta.story({
  parameters: {
    // El `render` ya enumera los 8 tamaños (4 con texto + 4 icon-only).
    // Mantenemos `variant` y `color` como controles para que el usuario
    // pueda ver cómo se ve un size concreto en otros colores.
    controls: { exclude: ["size"] },
    docs: {
      description: {
        story:
          'Pasa `size="..."` al componente. Las variantes `icon-*` esperan un ícono como `children`.',
      },
      source: {
        code: `<Button size="xs">Extra small</Button>
<Button size="sm">Small</Button>
<Button size="default">Default</Button>
<Button size="lg">Large</Button>

<Button size="icon-xs" aria-label="Add"><PlusIcon /></Button>
<Button size="icon-sm" aria-label="Add"><PlusIcon /></Button>
<Button size="icon" aria-label="Add"><PlusIcon /></Button>
<Button size="icon-lg" aria-label="Add"><PlusIcon /></Button>`,
      },
    },
  },
  render: () => (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Con texto
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="xs">Extra small</Button>
          <Button size="sm">Small</Button>
          <Button size="default">Default</Button>
          <Button size="lg">Large</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          Solo ícono
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="icon-xs" aria-label="Add">
            <PlusIcon />
          </Button>
          <Button size="icon-sm" aria-label="Add">
            <PlusIcon />
          </Button>
          <Button size="icon" aria-label="Add">
            <PlusIcon />
          </Button>
          <Button size="icon-lg" aria-label="Add">
            <PlusIcon />
          </Button>
        </div>
      </div>
    </div>
  ),
})

/**
 * **Ícono a la izquierda** (`data-icon="inline-start"`) o **a la derecha**
 * (`data-icon="inline-end"`). El padding se ajusta automáticamente.
 */
export const WithIcon = meta.story({
  parameters: {
    docs: {
      description: {
        story:
          'Envuelve el ícono en un `<span data-icon="inline-start">` o `inline-end` para activar el ajuste de padding.',
      },
      source: {
        code: `<Button>
  <PlusIcon data-icon="inline-start" />
  Crear
</Button>

<Button variant="outline" color="neutral">
  Continuar
  <ArrowRightIcon data-icon="inline-end" />
</Button>`,
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-2 p-6">
      <Button>
        <span data-icon="inline-start">
          <PlusIcon />
        </span>
        Crear
      </Button>
      <Button variant="outline" color="neutral">
        Continuar
        <span data-icon="inline-end">
          <ArrowRightIcon />
        </span>
      </Button>
    </div>
  ),
})

/**
 * Estado **disabled**. El cursor pasa a `not-allowed` (configurado en
 * `index.css`) y se reduce la opacidad al 50%.
 */
export const Disabled = meta.story({
  args: { disabled: true, children: "Disabled" },
  parameters: {
    docs: {
      description: {
        story: "Aplica `disabled` directamente — no requiere variant/color extra.",
      },
      source: {
        code: `<Button disabled>Disabled</Button>`,
      },
    },
  },
})

/**
 * **Button como enlace.** Usa `render={<a href="..." />}` para preservar los
 * estilos y accesibilidad del botón pero renderizando un `<a>`. Esto evita el
 * antipatrón de envolver `<a>` dentro de `<Button>`.
 */
export const AsLink = meta.story({
  args: {
    // `nativeButton={false}` es necesario al renderizar como `<a>` — el primitive
    // de @base-ui asume `<button>` por default y avisa en consola si no.
    render: <a href="#" />,
    nativeButton: false,
    children: "Ver detalles",
  },
  parameters: {
    // Esta story demuestra el patrón `render` — los controles de variant/color
    // no aplican porque el ejemplo ya está fijo.
    controls: { disable: true },
    docs: {
      description: {
        story:
          "`render` viene de `@base-ui/react/use-render` — el botón se monta como `<a>` pero mantiene su semántica accesible. Recuerda pasar `nativeButton={false}`.",
      },
      source: {
        code: `<Button render={<a href="/docs" />} nativeButton={false}>
  Ver detalles
</Button>`,
      },
    },
  },
})

/**
 * Estado de **carga**. Reemplaza el ícono por un `<SpinnerIcon>` y deshabilita
 * el botón para evitar dobles submits. Usa `aria-busy` para tecnología asistiva.
 */
export const Loading = meta.story({
  parameters: {
    // Estado fijo (spinner + disabled). Tweakear variant/color diluye el mensaje.
    controls: { disable: true },
    docs: {
      description: {
        story:
          'Combina `disabled` + un spinner inline. Considera agregar `aria-busy="true"` desde tu capa de estado.',
      },
      source: {
        code: `<Button disabled aria-busy="true">
  <SpinnerIcon data-icon="inline-start" className="animate-spin" />
  Guardando…
</Button>`,
      },
    },
  },
  render: () => (
    <Button disabled aria-busy="true">
      <span data-icon="inline-start">
        <SpinnerIcon className="animate-spin" />
      </span>
      Guardando…
    </Button>
  ),
})

/**
 * **Personalización de color** vía `className`. Útil para un caso puntual sin
 * agregar un color al design system. Pasa las clases de Tailwind directamente.
 */
export const CustomColors = meta.story({
  parameters: {
    // El `render` ya define los colores custom — controles no aplican.
    controls: { disable: true },
    docs: {
      description: {
        story:
          "`buttonVariants` también está exportado — úsalo para extender componentes que no son `<Button>` (por ej. un `<a>` estilizado).",
      },
      source: {
        code: `<Button className="bg-purple-600 text-white hover:bg-purple-700">
  Purple
</Button>

<a href="#" className={buttonVariants({ variant: 'fill', color: 'primary' })}>
  buttonVariants en <a>
</a>`,
      },
    },
  },
  render: () => (
    <div className="flex flex-wrap items-center gap-2 p-6">
      <Button className="bg-purple-600 text-white hover:bg-purple-700">Purple</Button>
      <Button className="bg-pink-600 text-white hover:bg-pink-700">Pink</Button>
      <a
        href="#"
        className={buttonVariants({
          variant: "fill",
          color: "primary",
          size: "default",
        })}
      >
        buttonVariants en &lt;a&gt;
      </a>
    </div>
  ),
})
