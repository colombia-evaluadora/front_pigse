import { createContext, useContext } from "react"

/**
 * Variante visual del campo, al estilo MUI TextField. `plain` es el
 * comportamiento histórico (label estático arriba). Las variantes MUI activan
 * el label flotante coordinado desde `Field`: el `Input` sigue aportando el
 * borde/fondo y el `FieldLabel` la posición flotante — no se fusionan en un
 * único componente, `Field` solo comparte la variante por contexto.
 */
export type FieldVariant = "plain" | "outlined" | "filled" | "standard"

export const FieldVariantContext = createContext<FieldVariant>("plain")

/** Lee la variante del `Field` contenedor (o `plain` fuera de uno). */
export function useFieldVariant() {
  return useContext(FieldVariantContext)
}

/** `true` cuando la variante activa el label flotante estilo MUI. */
export const isFloatingVariant = (variant: FieldVariant) => variant !== "plain"
