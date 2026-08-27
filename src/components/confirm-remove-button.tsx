import { type ReactElement, type ReactNode, useState } from "react"

import { cn } from "@/lib/utils"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { ComponentProps } from "react"
import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"

/**
 * Confirmación destructiva — cabecera + descripción + dos botones (confirm /
 * cancel) con spinner mientras la promesa de `onConfirm` está pendiente.
 *
 * Es la versión universal de los cuatro diálogos que vivían repetidos en
 * `dialog-delete.tsx` de cada feature. Lo único que cambia entre uno y otro
 * es:
 *   - el `trigger` (botón con papelera, botón con texto, slot externo…)
 *   - el `title` y la `description`
 *   - la acción (`onConfirm`)
 *
 * El botón interno de papelera vive en `ConfirmRemoveButton`, que monta este
 * componente con el trigger ya armado. Quien necesita su propio trigger lo
 * usa directo (`<ConfirmRemoveDialog trigger={...} />`).
 *
 * Implementación: el `trigger` se monta adentro de un `<AlertDialogTrigger>`
 * via shadcn's `render` prop, así el AlertDialog controla el open/close sin
 * estado duplicado. Si el padre ya pasó un `<AlertDialogTrigger>` propio, se
 * respeta tal cual para no romper el caso del `menu-transfer.tsx` (donde el
 * trigger vive dentro de su propia `<ContextMenu>`).
 */
interface ConfirmRemoveDialogProps {
  title: ReactNode
  description: ReactNode
  confirmLabel?: ReactNode
  cancelLabel?: ReactNode
  /**
   * Elemento que abre el diálogo. Si ya es un `<AlertDialogTrigger>` se usa
   * tal cual. Si es cualquier otro (un `<Button>` propio, un ícono de fila…),
   * se monta adentro de un `<AlertDialogTrigger render={...}>` para que el
   * AlertDialog lo conecte al contexto de open/close.
   */
  trigger: ReactElement
  onConfirm: () => void | boolean | Promise<void | boolean | unknown>
  /** Si se sabe que no hay nada que borrar, podés retornar `null` directo. */
  hidden?: boolean
  className?: string
}

export function ConfirmRemoveDialog({
  title,
  description,
  confirmLabel = "Sí",
  cancelLabel = "No",
  trigger,
  onConfirm,
  hidden,
  className,
}: ConfirmRemoveDialogProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  if (hidden) return null

  async function handleConfirm() {
    setPending(true)
    const result = await onConfirm()
    setPending(false)
    if (result !== false) setOpen(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={trigger} />
      <AlertDialogContent className={cn(className)}>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            onClick={handleConfirm}
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            {confirmLabel}
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={pending}>
            <XIcon data-icon="inline-start" />
            {cancelLabel}
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface ConfirmRemoveButtonProps {
  description: ReactNode
  label: string
  title?: ReactNode
  onConfirm: () => void | boolean | Promise<void | boolean | unknown>
  disabled?: boolean
  size?: ComponentProps<typeof Button>["size"]
  className?: string
}

/**
 * Wrapper con el trigger de papelera pre-armado. Es lo que se monta
 * directamente en la fila de la tabla. Para triggers custom (botón con
 * texto, slot externo) usar `ConfirmRemoveDialog` directo.
 */
export function ConfirmRemoveButton({
  description,
  label,
  title = "Eliminar",
  onConfirm,
  disabled,
  size = "icon-sm",
  className,
}: ConfirmRemoveButtonProps) {
  return (
    <ConfirmRemoveDialog
      title={title}
      description={description}
      onConfirm={onConfirm}
      className={className}
      trigger={
        <Button
          type="button"
          variant="ghost"
          color="neutral"
          size={size}
          disabled={disabled}
          aria-label={label}
        >
          <span className="sr-only">{label}</span>
          <TrashIcon />
        </Button>
      }
    />
  )
}
