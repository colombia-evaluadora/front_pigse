import preview from "../../../../.storybook/preview"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

// Backtick literal dentro de un template literal (ver badge.stories.tsx).
const BT = "`"

const meta = preview.meta({
  title: "Design System/Forms/Field",
  component: Field,
  tags: ["autodocs"],
  argTypes: {
    orientation: {
      control: { type: "select" },
      options: ["vertical", "horizontal", "responsive"],
      description:
        "Cómo se distribuyen label y control: apilados, en fila, o apilados que pasan a fila cuando el `FieldGroup` supera `@md`.",
      table: { defaultValue: { summary: "vertical" } },
    },
    variant: {
      control: { type: "select" },
      options: ["plain", "outlined", "filled", "standard"],
      description:
        "Estilo del campo. `plain` = label normal arriba. `outlined`/`filled`/`standard` colocan el label fijo en su posición (no ocupa el espacio del placeholder).",
      table: { defaultValue: { summary: "plain" } },
    },
  },
  parameters: {
    docs: {
      description: {
        component: `

# Field

Contenedor que agrupa un control con su **${BT}FieldLabel${BT}**, **${BT}FieldDescription${BT}**
y **${BT}FieldError${BT}** — sin fusionarlos: cada parte sigue siendo su propio
componente. ${BT}Field${BT} solo orquesta el layout y comparte su variante por contexto.

Dos ejes **independientes** gobiernan el resultado:

- **${BT}orientation${BT}** → ${BT}vertical${BT} · ${BT}horizontal${BT} · ${BT}responsive${BT}
- **${BT}variant${BT}** → ${BT}plain${BT} · ${BT}outlined${BT} · ${BT}filled${BT} · ${BT}standard${BT}

---

## Los dos ejes

**Orientación** — cómo se acomodan label y control:
- ${BT}vertical${BT} (default): label sobre el control. Para inputs de texto.
- ${BT}horizontal${BT}: label y control en fila. Para controles compactos (checkbox, switch).
- ${BT}responsive${BT}: apila en angosto y pasa a fila cuando el ${BT}FieldGroup${BT} supera ${BT}@md${BT}.

**Variante** — el estilo del campo. En las tres el label queda **fijo** (no baja
a ocupar el espacio del placeholder):
- ${BT}plain${BT}: label normal encima (comportamiento por defecto).
- ${BT}outlined${BT}: caja con borde; el label fijo sobre el borde superior (notch).
- ${BT}filled${BT}: fondo relleno; el label fijo dentro, arriba.
- ${BT}standard${BT}: subrayado; el label fijo por encima de la línea.

> La variante se declara **una vez** en ${BT}Field${BT}: el ${BT}Input${BT} aporta el
> borde/fondo y el ${BT}FieldLabel${BT} la posición, leyendo la variante del contexto.

---

## Anatomía

${BT}${BT}${BT}
FieldSet
 └ FieldLegend        (título del grupo)
 └ FieldGroup         (espaciado entre campos)
    └ Field           (orientation + variant)
       └ FieldLabel
       └ Input / Checkbox / Switch …
       └ FieldContent (agrupa label + descripción al lado del control)
       └ FieldDescription
       └ FieldError
    └ FieldSeparator  (divide campos)
${BT}${BT}${BT}

---

## Accesibilidad

- Asociá siempre ${BT}FieldLabel htmlFor${BT} con el ${BT}id${BT} del control.
- Estado inválido: ${BT}data-invalid${BT} en el ${BT}Field${BT} (color) + ${BT}aria-invalid${BT} en el control.
- ${BT}FieldError${BT} usa ${BT}role="alert"${BT} para anunciar el error.

---

## API

La tabla de props se autogenera desde los tipos de TypeScript.
`,
      },
    },
  },
})

export default meta

/* -------------------------------------------------------------------------- */

/**
 * **Playground** — un único campo controlado por los selects `orientation` y
 * `variant`. Cambialos para recorrer todas las combinaciones.
 */
export const Default = meta.story({
  args: { orientation: "vertical", variant: "outlined" },
  render: (args) => (
    <FieldGroup className="w-80">
      <Field {...args}>
        <FieldLabel htmlFor="pg">Nombre</FieldLabel>
        <Input id="pg" placeholder="Jane Doe" />
        <FieldDescription>Como aparece en tu documento.</FieldDescription>
      </Field>
    </FieldGroup>
  ),
})

/**
 * Las 4 variantes con el mismo campo. En `outlined`/`filled`/`standard` el label
 * queda fijo arriba y el placeholder se sigue viendo dentro.
 */
export const Variants = meta.story({
  parameters: {
    controls: { disable: true },
    docs: {
      source: {
        code: `<Field variant="outlined">
  <FieldLabel htmlFor="name">Nombre</FieldLabel>
  <Input id="name" />
</Field>`,
      },
    },
  },
  render: () => (
    <FieldGroup className="w-80">
      <Field variant="plain">
        <FieldLabel htmlFor="v-plain">plain</FieldLabel>
        <Input id="v-plain" placeholder="Jane Doe" />
      </Field>
      <Field variant="outlined">
        <FieldLabel htmlFor="v-outlined">outlined</FieldLabel>
        <Input id="v-outlined" placeholder="Jane Doe" />
      </Field>
      <Field variant="filled">
        <FieldLabel htmlFor="v-filled">filled</FieldLabel>
        <Input id="v-filled" placeholder="jane@example.com" />
      </Field>
      <Field variant="standard">
        <FieldLabel htmlFor="v-standard">standard</FieldLabel>
        <Input id="v-standard" placeholder="123456789" />
      </Field>
    </FieldGroup>
  ),
})

/**
 * Las 3 orientaciones. `horizontal` y `responsive` brillan con controles
 * compactos y `FieldContent` (label + descripción a un lado). El bloque
 * responsive es redimensionable: arrastrá el borde derecho.
 */
export const Orientations = meta.story({
  parameters: { controls: { disable: true } },
  render: () => (
    <div className="flex flex-col gap-6">
      <Field orientation="vertical" className="w-80">
        <FieldLabel htmlFor="o-vertical">vertical</FieldLabel>
        <Input id="o-vertical" placeholder="Jane Doe" />
      </Field>

      <Field orientation="horizontal" className="w-80">
        <Checkbox id="o-horizontal" />
        <FieldLabel htmlFor="o-horizontal">horizontal — acepto los términos</FieldLabel>
      </Field>

      <FieldGroup className="w-80 resize-x overflow-auto rounded-md border p-4">
        <Field orientation="responsive">
          <FieldContent>
            <FieldLabel htmlFor="o-responsive">responsive</FieldLabel>
            <FieldDescription>Apila en angosto, fila en ancho.</FieldDescription>
          </FieldContent>
          <Switch id="o-responsive" defaultChecked />
        </Field>
      </FieldGroup>
    </div>
  ),
})

/**
 * Composición completa: `FieldSet` + `FieldLegend` agrupan, `FieldGroup`
 * espacia y `FieldSeparator` divide.
 */
export const Composition = meta.story({
  parameters: { controls: { disable: true } },
  render: () => (
    <FieldSet className="w-80">
      <FieldLegend>Acceso</FieldLegend>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="c-email">Correo</FieldLabel>
          <Input id="c-email" type="email" placeholder="jane@example.com" />
        </Field>
        <FieldSeparator>o</FieldSeparator>
        <Field>
          <FieldLabel htmlFor="c-user">Usuario</FieldLabel>
          <Input id="c-user" placeholder="janedoe" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
})

/**
 * Descripción y error, con control de `variant` para verlos en cada estilo.
 * `FieldError` reemplaza a la descripción cuando el campo es inválido — marcá
 * `data-invalid` en el `Field` y `aria-invalid` en el input.
 */
export const DescriptionAndError = meta.story({
  args: { variant: "plain" },
  parameters: { controls: { include: ["variant"] } },
  render: ({ variant }) => (
    <FieldGroup className="w-80">
      <Field variant={variant}>
        <FieldLabel htmlFor="d-user">Usuario</FieldLabel>
        <Input id="d-user" placeholder="janedoe" />
        <FieldDescription>Se usará para iniciar sesión.</FieldDescription>
      </Field>
      <Field variant={variant} data-invalid="true">
        <FieldLabel htmlFor="d-pass">Contraseña</FieldLabel>
        <Input id="d-pass" type="password" aria-invalid />
        <FieldError errors={[{ message: "La contraseña es obligatoria." }]} />
      </Field>
    </FieldGroup>
  ),
})
