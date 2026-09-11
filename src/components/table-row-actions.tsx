import { cn } from "@/lib/utils"

/*
 * La columna de acciones de las tablas que se arman a mano (las de los
 * diálogos, que ordenan con estado local y no con TanStack, así que no pueden
 * reutilizar `DataTable`). Vivía copiada en cada una de esas tablas y se fue
 * separando entre ellas; acá queda una sola versión.
 *
 * La celda es `sticky` y de 1px —los botones van absolutos, su min-content es
 * 0— y el `spacer` que va JUSTO ANTES es quien le reserva el ancho en el flujo,
 * para que la columna no se lleve una tajada del reparto.
 */
export const ACTIONS_CELL_CLASS = "sticky right-0 z-10 w-px"

const ACTIONS_SPACER_WIDTH = 96

export const actionsSpacerCell = (
  <td aria-hidden className="p-0">
    <div style={{ width: ACTIONS_SPACER_WIDTH }} />
  </td>
)

export const actionsSpacerHeadCell = (
  <th aria-hidden className="p-0">
    <div style={{ width: ACTIONS_SPACER_WIDTH }} />
  </th>
)

/**
 * El bloque de botones: va a sangre contra el borde derecho, con el alto
 * completo de la fila, y aparece con el mismo fade que el hover (150ms, el
 * default de Tailwind) para que entren juntos.
 *
 * El fondo es el mismo color del hover de `TableRow` (`bg-muted/50`) pero ya
 * resuelto: acá hace falta opaco, porque el bloque tapa las columnas que pasan
 * por debajo al scrollear. Se mezcla contra `--popover` y no contra `--card`
 * como en `DataTable` porque estas tablas viven dentro de un Dialog —en el tema
 * rojo los dos tokens no coinciden—.
 *
 * `active` deja el bloque fijo: mientras se edita una fila, guardar y cancelar
 * no pueden depender de que el puntero siga encima. Lo mismo la fila de carga.
 *
 * El revelado por teclado va con `has(:focus-visible)` y no con `focus-within`:
 * al hacer click el botón queda enfocado, y como React reusa ese nodo del DOM
 * al cambiar la fila entre modo lectura y edición, el foco sobrevive al cambio
 * y `focus-within` dejaba el bloque pegado hasta hacer click en otro lado.
 * `:focus-visible` solo lo activa el foco por teclado, que es a quien apunta la
 * regla.
 *
 * La fila que lo contiene tiene que llevar `group/row`.
 */
export const actionsOverlayClass = (active = false) =>
  cn(
    "absolute inset-y-0 right-0 z-10 flex items-center gap-1 px-2 transition-opacity",
    "bg-[color-mix(in_srgb,var(--muted)_28%,var(--popover))]",
    active
      ? "opacity-100"
      : "opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100",
  )
