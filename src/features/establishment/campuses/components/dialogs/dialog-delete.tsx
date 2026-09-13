import { useState } from "react"

import { CheckIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/ui/icons"

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
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { campusesRoute } from "@/router"

import { useDelete } from "@/features/establishment/campuses/api/mutations/delete"
import type { Campus } from "@/features/establishment/campuses/api/types/campus"
import { useNotify } from "@/components/notice/notice-context"
import { useMenuPermission } from "@/features/navigation/api/use-menu-permission"

interface DeleteCampusDialogProps {
  campus: Campus
}

export function DeleteCampusDialog({ campus }: DeleteCampusDialogProps) {
  const [open, setOpen] = useState(false)
  const navigate = campusesRoute.useNavigate()
  const { notify } = useNotify()
  const { puedeEliminar } = useMenuPermission("SEDES_EDUCATIVAS")

  const deleteMutation = useDelete({
    mutationConfig: {
      onSuccess: (result) => {
        setOpen(false)
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }

        notify(SUCCESS_MESSAGES.campus.deleted)
        navigate({
          search: (prev) => ({
            ...prev,
            page: 0,
          }),
          replace: true,
        })
      },
      onError: (error) => {
        setOpen(false)
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  if (!puedeEliminar) return null

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            color="neutral"
            size="icon-sm"
            aria-label={`Eliminar ${campus.name}`}
          />
        }
      >
        <TrashIcon />
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar</AlertDialogTitle>
          <AlertDialogDescription>
            Se eliminará permanentemente la sede educativa {campus.name}. Esta
            acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction
            color="destructive"
            disabled={deleteMutation.isPending}
            aria-busy={deleteMutation.isPending}
            onClick={() => deleteMutation.mutate(campus.id)}
          >
            {deleteMutation.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Si
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={deleteMutation.isPending}>
            <XIcon data-icon="inline-start" />
            No
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}