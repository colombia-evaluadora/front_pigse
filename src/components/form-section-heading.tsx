import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

type HeadingLevel = "h1" | "h2" | "h3" | "h4" | "h5" | "h6"

interface FormSectionHeadingProps {
  /** Texto del encabezado. */
  children: ReactNode
  /** Nivel de heading. Por defecto `h3` (subsección dentro de un formulario). */
  as?: HeadingLevel
  /** Clases extra para ajustar márgenes o color en un contexto particular. */
  className?: string
  /** Identificador opcional, útil para `aria-labelledby` o anclas. */
  id?: string
}
export function FormSectionHeading({
  children,
  as: Component = "h3",
  className,
  id,
}: FormSectionHeadingProps) {
  return (
    <Component id={id} className={cn("text-lg font-semibold", className)}>
      {children}
    </Component>
  )
}
