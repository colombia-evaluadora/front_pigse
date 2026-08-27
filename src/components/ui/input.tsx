import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useFieldVariant, type FieldVariant } from "@/hooks/use-field-variant"

const inputVariants = cva(
  // `text-sm` fijo, no el `text-base md:text-sm` de shadcn: ese default existe
  // para que Safari en iOS no haga zoom al enfocar un campo de menos de 16px,
  // pero dejaba al input más grande que el resto de los controles (las opciones
  // de Select/Combobox son `text-sm` siempre) en viewports angostos. La app se
  // usa en escritorio, así que pesa más la consistencia.
  "w-full min-w-0 bg-transparent text-sm transition-[color,border-color,background-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
  {
    variants: {
      variant: {
        standard:
          "rounded-none border border-transparent border-b-input px-0 py-2 focus-visible:border-b-ring aria-invalid:border-b-red dark:aria-invalid:border-b-red/50",
        outlined:
          "rounded-md border border-input px-3 py-2 hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 aria-invalid:border-red aria-invalid:focus-visible:border-red aria-invalid:focus-visible:ring-red/20",
        filled:
          "rounded-t-md border-0 border-b border-b-input bg-muted/40 px-3 pt-6 pb-2 hover:bg-muted/55 focus-visible:border-b-ring focus-visible:bg-muted/50 aria-invalid:border-b-red",
      },
      // `size` controla la altura. Vive en una variante aparte (no en el
      // `variant`) para que `Input` y `Select` queden alineados: ambos
      // comparten `inputVariants`, así que `sm` se hereda gratis al trigger.
      size: {
        default: "h-11",
        sm: "h-10",
      },
    },
    // `filled` reserva más alto para que el label flotante no le pise el
    // contenido. El resto de variantes usa la altura default del `size`.
    compoundVariants: [{ variant: "filled", size: "default", class: "h-15" }],
    defaultVariants: {
      variant: "standard",
      size: "default",
    },
  },
)

/**
 * Capa que se compone encima de `inputVariants` para los controles que tienen
 * forma de input pero abren un popup (`Select`, `DatePicker`). Aporta el
 * estado abierto: como el foco vive en el popup mientras está desplegado, el
 * borde tiene que reaccionar a `data-popup-open` — es el equivalente del
 * `focus-visible` del input, que ahí no aplica — para que el campo no se
 * "apague" al abrirlo.
 */
const inputTriggerVariants = cva("cursor-pointer", {
  variants: {
    variant: {
      standard: "data-[popup-open]:border-b-ring",
      outlined:
        "data-[popup-open]:border-ring data-[popup-open]:ring-2 data-[popup-open]:ring-ring/20",
      filled: "data-[popup-open]:border-b-ring data-[popup-open]:bg-muted/50",
    },
  },
  defaultVariants: {
    variant: "standard",
  },
})

type InputVariant = Exclude<FieldVariant, "plain">

/**
 * Resuelve la variante visual de un control: la explícita si la hay, sino la
 * del `Field` contenedor. `plain` (el default del `Field`, sin label flotante)
 * no tiene forma propia, así que cae en `standard`.
 */
function useInputVariant(variant?: InputVariant | null): InputVariant {
  const fieldVariant = useFieldVariant()
  return variant ?? (fieldVariant === "plain" ? "standard" : fieldVariant)
}

type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  Omit<VariantProps<typeof inputVariants>, "size"> & {
    // `VariantProps` no infiera `size` correctamente cuando hay
    // `compoundVariants` en cva 0.7.x; lo declaramos a mano. También
    // omitimos el `size` de `React.ComponentProps<"input">` (que es el
    // atributo HTML de ancho numérico) para que no choque con el nuestro.
    size?: "default" | "sm"
  }

function Input({ className, type, variant, size = "default", ...props }: InputProps) {
  const resolvedVariant = useInputVariant(variant)

  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(inputVariants({ variant: resolvedVariant, size }), className)}
      {...props}
    />
  )
}

export { Input, inputVariants, inputTriggerVariants, useInputVariant, type InputVariant }
