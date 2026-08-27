import { useEffect, useRef } from "react"
import { InfoIcon, WarningCircleIcon, XIcon } from "@/components/ui/icons"

import { cn } from "@/lib/utils"

export interface Notice {
  /**
   * Identificador incremental de la notificación. Cambia con cada acción para
   * que, aunque el mensaje se repita, se muestre siempre la última (y se
   * reinicie el auto-cierre).
   */
  id: number
  message: string
}

export type NoticeVariant = "info" | "success" | "error"

/**
 * Fondo `X-22` alineado con la variante soft del Badge: misma familia de color
 * para que la notificación se lea como pariente de los badges "soft" del
 * formulario. Borde transparente que solo reserva el 1px, y el mensaje en
 * `foreground`: el texto es lo que se lee, no lo que colorea. El color de la
 * variante queda para los íconos.
 *
 * `info` usa `bg-primary-22` (soft fill de marca) con texto e ícono en
 * `primary` — sigue el mismo patrón que los items marcados del dropdown y
 * que los badges soft del formulario, así el aviso se lee como pariente de
 * esos elementos. `success` y `error` conservan los tonos suaves porque su
 * color ya comunica el resultado.
 */
const VARIANT_CLASSES: Record<NoticeVariant, string> = {
  info: "border-transparent bg-primary-22 text-primary",
  success: "border-transparent bg-green-22 text-foreground",
  error: "border-transparent bg-red-22 text-foreground",
}

/** Los íconos —el de la variante y la X de cerrar— sí llevan el color. */
const VARIANT_ICON_CLASSES: Record<NoticeVariant, string> = {
  info: "text-primary",
  success: "text-green",
  error: "text-red",
}

/**
 * El aviso informa del resultado de una acción; no es un "listo" con chulito
 * —el check duplicaba el mensaje y competía con los botones de confirmar—, así
 * que el éxito comparte el ícono de información con `info`. El error sí cambia:
 * ahí el ícono es parte de la advertencia.
 */
const VARIANT_ICON: Record<NoticeVariant, typeof InfoIcon> = {
  info: InfoIcon,
  success: InfoIcon,
  error: WarningCircleIcon,
}

interface NoticeBannerProps {
  notice: Notice | null
  onClose: () => void
  variant?: NoticeVariant
  /**
   * Si se indica, la notificación se cierra sola después de estos ms. El
   * temporizador se reinicia cada vez que cambia `notice.id`.
   */
  autoCloseMs?: number
  className?: string
}

/**
 * Banner de notificación inline. Muestra una única notificación: cada nueva
 * acción reemplaza a la anterior sin apilarse. Con `autoCloseMs` se descarta
 * automáticamente.
 */
export function NoticeBanner({
  notice,
  onClose,
  variant = "info",
  autoCloseMs,
  className,
}: NoticeBannerProps) {
  const noticeId = notice?.id

  // Ref para no reiniciar el temporizador en cada render por un `onClose` nuevo.
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (noticeId == null || !autoCloseMs) return
    const timeout = setTimeout(() => onCloseRef.current(), autoCloseMs)
    return () => clearTimeout(timeout)
  }, [noticeId, autoCloseMs])

  if (!notice) return null

  const Icon = VARIANT_ICON[variant]

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-md border px-4 py-1 text-sm font-medium",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      <Icon className={cn("size-5 shrink-0", VARIANT_ICON_CLASSES[variant])} />
      <span className="flex-1">{notice.message}</span>
      <button
        type="button"
        aria-label="Cerrar notificación"
        onClick={onClose}
        className={cn(
          "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-current/10",
          VARIANT_ICON_CLASSES[variant],
        )}
      >
        <XIcon className="size-4" />
      </button>
    </div>
  )
}
