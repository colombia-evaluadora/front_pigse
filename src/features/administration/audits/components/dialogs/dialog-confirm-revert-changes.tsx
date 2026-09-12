import { useRef, useState } from "react"

import { ArrowCounterClockwiseIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"

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

import { useRevertOperationChange } from "@/features/administration/audits/api/mutations/revert-operation-change"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { NoticeBanner, type NoticeVariant } from "@/components/notice/notice-banner"

interface DialogConfirmRevertChangesProps {
  tableSlug: string
  operationId: string
  fieldIndexes: number[]
  /** Se llama cuando el revert se aplicó: el padre cierra su propio dialog. */
  onReverted?: () => void
}

/**
 * Tercer dialog del flujo de cambios: pide confirmación antes de mandar el
 * revert. Recibe el `operationId` (y el slug) desde el dialog padre — la
 * acción destructiva nunca se dispara sin paso explícito por acá.
 *
 * Los ERRORES se muestran en un `NoticeBanner` propio, adentro del modal:
 * un toast global quedaría detrás del overlay. Ese banner se maneja con
 * estado local (`notice`), no hace falta un `NoticeProvider` para él.
 *
 * El ÉXITO sí va al aviso de la PÁGINA (`useNotify` del provider de arriba):
 * el modal se cierra, así que un banner adentro se iría con él. Antes este
 * componente montaba su propio `NoticeProvider` sin un `NoticeOutlet`
 * adentro, así que ese `notify()` de éxito no lo renderizaba nadie — el
 * mensaje del backend ("Reversión aplicada.") se perdía en el vacío.
 */
export function DialogConfirmRevertChanges({
  tableSlug,
  operationId,
  fieldIndexes,
  onReverted,
}: DialogConfirmRevertChangesProps) {
  const [open, setOpen] = useState(false)

  return (
    <DialogConfirmRevertChangesInner
      open={open}
      onOpenChange={setOpen}
      tableSlug={tableSlug}
      operationId={operationId}
      fieldIndexes={fieldIndexes}
      onReverted={onReverted}
    />
  )
}

function DialogConfirmRevertChangesInner({
  open,
  onOpenChange,
  tableSlug,
  operationId,
  fieldIndexes,
  onReverted,
}: DialogConfirmRevertChangesProps & {
  open: boolean
  onOpenChange: (next: boolean) => void
}) {
  const { notify } = useNotify()
  const [notice, setNotice] = useState<{
    id: number
    message: string
    variant: NoticeVariant
  } | null>(null)
  const noticeIdRef = useRef(0)

  function notifyInDialog(message: string, options?: { variant?: NoticeVariant }) {
    noticeIdRef.current += 1
    setNotice({ id: noticeIdRef.current, message, variant: options?.variant ?? "error" })
  }

  const revertChange = useRevertOperationChange({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notifyInDialog(result.message)
          return
        }
        setNotice(null)
        // `result.message` es el del backend ("Reversión aplicada.").
        notify(result.message)
        onOpenChange(false)
        // Cierra también el dialog de detalle que está detrás: sus datos
        // acaban de cambiar y quedarse ahí sugiere que no pasó nada.
        onReverted?.()
      },
      onError: (error) => {
        notifyInDialog(getErrorMessage(error))
      },
    },
  })

  const disabled = revertChange.isPending || fieldIndexes.length === 0

  function handleConfirm() {
    setNotice(null)
    revertChange.mutate({ tableSlug, operationId, fieldIndexes })
  }

  function handleOpenChange(next: boolean) {
    // Cerrar el dialog (overlay click, ESC, X) limpia cualquier aviso pendiente
    // para que no reaparezca la próxima vez que se abra.
    if (!next) setNotice(null)
    onOpenChange(next)
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        render={
          <Button
            type="button"
            variant="fill"
            color="primary"
            size="sm"
            disabled={disabled}
            aria-label="Revertir todos los cambios mostrados"
          />
        }
      >
        <ArrowCounterClockwiseIcon weight="bold" data-icon="inline-start" />
        Revertir
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Revertir los cambios?</AlertDialogTitle>
          <AlertDialogDescription>
            Se van a restaurar {fieldIndexes.length} campo(s) a su valor anterior. Esta acción no se
            puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* Mismo patrón que `dialog-create-evaluation-period`: el aviso va
            pegado debajo del header, dentro del modal, no en el toast global
            que queda detrás del overlay. El error no se autocierra — se queda
            hasta que el usuario lo descarte o reintente — y el éxito sí, con
            el mismo `autoCloseMs` de 4s que ya usa academic-period. */}
        <NoticeBanner
          notice={notice}
          onClose={() => setNotice(null)}
          variant={notice?.variant}
          autoCloseMs={notice?.variant === "error" ? undefined : 4000}
        />

        <AlertDialogFooter>
          <AlertDialogAction
            disabled={revertChange.isPending}
            aria-busy={revertChange.isPending}
            onClick={handleConfirm}
          >
            {/* El spinner reemplaza al icono en vez de sumarse: así el ancho
                del botón no salta al entrar en loading. */}
            {revertChange.isPending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <ArrowCounterClockwiseIcon data-icon="inline-start" />
            )}
            Revertir
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral">
            <XIcon data-icon="inline-start" />
            Cerrar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
