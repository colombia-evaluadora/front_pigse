"use client"

import { useState } from "react"

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
import { CheckIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

interface DialogBulkDeleteProps<T, TId> {
  // Elementos seleccionados. Necesitamos su `id` para la mutación y la
  // descripción legible (ej. mostrar nombres en el mensaje de confirmación).
  items: T[]
  getItemId: (item: T) => TId
  getItemLabel: (item: T) => string

  // Encabezado corto de la confirmación (ej. "¿Eliminar los
  // establecimientos seleccionados?"). El detalle largo va en la
  // descripción, no acá.
  title: string

  // Wording reutilizable: cada submódulo aporta una función que arma la
  // descripción (incluye los nombres de los registros a borrar y la
  // advertencia de "no se puede deshacer"). Se reusan los `AlertDialog` y
  // `Button` del UI.
  buildDescription: (count: number, sample: string[]) => string

  // Disparado al confirmar. Devuelve una promesa; mientras esté pendiente
  // el botón de acción muestra un spinner (igual que los diálogos unitarios).
  onConfirm: (ids: TId[]) => Promise<unknown>

  // Etiqueta del trigger que abre el diálogo. El padre decide si lo pinta
  // (ej. el botón flotante de "Eliminar selección") o lo deja sin trigger.
  triggerLabel?: string
}

export function DialogBulkDelete<T, TId>({
  items,
  getItemId,
  getItemLabel,
  title,
  buildDescription,
  onConfirm,
  triggerLabel,
}: DialogBulkDeleteProps<T, TId>) {
  const [open, setOpen] = useState(false)
  const [isPending, setIsPending] = useState(false)

  const count = items.length
  const sample = items.slice(0, 3).map(getItemLabel)

  async function handleConfirm() {
    setIsPending(true)
    try {
      await onConfirm(items.map(getItemId))
      setOpen(false)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        // Mientras la mutación está en curso no dejamos cerrar el diálogo: si
        // el usuario hace click fuera, el alert dialog se queda abierto hasta
        // que termine la promesa. Igual que en los diálogos de borrado simple.
        if (!isPending) {
          setOpen(next)
        }
      }}
    >
      {triggerLabel ? (
        <AlertDialogTrigger
          render={
            <Button
              type="button"
              variant="fill"
              color="destructive"
              size="sm"
              aria-label={triggerLabel}
            />
          }
        >
          <CheckIcon data-icon="inline-start" />
          {triggerLabel}
        </AlertDialogTrigger>
      ) : null}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{buildDescription(count, sample)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={isPending}
            aria-busy={isPending}
            onClick={handleConfirm}
          >
            {isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={isPending}>
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
