import { useState } from "react"

import { XSquareIcon } from "@/components/ui/icons"

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

interface ClearSelectionAuditSessionDialogProps {
  resetSelection: () => void
}

export function ClearSelectionAuditSessionDialog({
  resetSelection,
}: ClearSelectionAuditSessionDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={<Button variant="outline" size="sm" aria-label="Deseleccionar" />}
      >
        <XSquareIcon />
        <span className="sr-only md:not-sr-only">Deseleccionar</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Deseleccionar todo?</AlertDialogTitle>
          <AlertDialogDescription>
            Se deseleccionarán todas las sesiones seleccionadas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              resetSelection()
              setOpen(false)
            }}
          >
            Deseleccionar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
