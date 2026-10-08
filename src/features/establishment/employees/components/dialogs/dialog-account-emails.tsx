import { useState, type ReactElement, type ReactNode } from "react"

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
import { CheckIcon, EnvelopeIcon, KeyIcon, SpinnerIcon, XIcon } from "@/components/ui/icons"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/overlay/tooltip"
import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"

import { useForgotPassword } from "@/features/auth/api/mutations/forgot-password"
import type { EstadoCuenta } from "@/features/establishment/employees/api/query/use-estado-cuenta"
import { useReenviarActivacion } from "@/features/establishment/employees/api/mutations/use-reenviar-activacion"
import type { EmployeeListItem } from "@/features/establishment/employees/api/types/employee"

interface ConfirmEmailActionProps {
  label: string
  icon: ReactElement
  title: string
  description: ReactNode
  /** Motivo por el que la acción no está disponible; si viene, el botón queda deshabilitado. */
  disabledReason?: string
  onConfirm: () => Promise<unknown>
}

/**
 * Botón de ícono de la fila con tooltip + confirmación. No reusa
 * `ConfirmRemoveDialog` porque ese pinta el botón de confirmar en rojo
 * (destructivo) y enviar un correo no lo es.
 *
 * Un botón `disabled` no recibe eventos de puntero, así que en ese caso el
 * tooltip va sobre un `<span>` envolvente para que el motivo se pueda leer.
 */
function ConfirmEmailAction({
  label,
  icon,
  title,
  description,
  disabledReason,
  onConfirm,
}: ConfirmEmailActionProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  if (disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span tabIndex={0} aria-label={`${label}: ${disabledReason}`} />}>
          <Button type="button" variant="ghost" color="neutral" size="icon-sm" disabled aria-hidden>
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent>{disabledReason}</TooltipContent>
      </Tooltip>
    )
  }

  async function handleConfirm() {
    setPending(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch {
      // El error ya se avisó en `onError` de la mutación; el diálogo se cierra
      // igual para que el aviso de la página quede a la vista.
      setOpen(false)
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <AlertDialogTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  color="neutral"
                  size="icon-sm"
                  aria-label={label}
                />
              }
            />
          }
        >
          {icon}
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleConfirm} disabled={pending} aria-busy={pending}>
            {pending ? (
              <SpinnerIcon data-icon="inline-start" className="animate-spin" />
            ) : (
              <CheckIcon data-icon="inline-start" />
            )}
            Enviar
          </AlertDialogAction>
          <AlertDialogCancel variant="fill" color="neutral" disabled={pending}>
            <XIcon data-icon="inline-start" />
            Cancelar
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

const SIN_CORREO = "El funcionario no tiene correo registrado"

/**
 * Envía el correo de "olvidé mi contraseña" al funcionario, reusando el
 * mismo endpoint público del login (`GET /sso-admin/forgotPassword`, con
 * `app` = la app de PIGSE vía `env.NAME`).
 */
export function ResetPasswordEmailAction({ employee }: { employee: EmployeeListItem }) {
  const { notify } = useNotify()
  const correo = employee.email?.trim()
  const forgotPassword = useForgotPassword({
    mutationConfig: {
      onSuccess: () => {
        notify(`Se envió el correo para restablecer la contraseña a ${correo}.`)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  return (
    <ConfirmEmailAction
      label="Enviar correo para restablecer contraseña"
      icon={<KeyIcon />}
      title="Restablecer contraseña"
      description={
        <>
          Se enviará un correo con el enlace para restablecer la contraseña de {employee.name} a{" "}
          <strong>{correo}</strong>.
        </>
      }
      disabledReason={correo ? undefined : SIN_CORREO}
      onConfirm={() => forgotPassword.mutateAsync(correo)}
    />
  )
}

const MOTIVO_NO_DISPONIBLE: Record<Exclude<EstadoCuenta, "PENDING_ACTIVATION">, string> = {
  ACTIVE: "La cuenta ya está activa; usa restablecer contraseña",
  INACTIVE: "La cuenta está inactiva",
  NOT_FOUND: "El funcionario no tiene una cuenta registrada",
}

interface ResendActivationEmailActionProps {
  employee: EmployeeListItem
  /** `undefined` mientras carga; `"error"` si la consulta falló. */
  estado: EstadoCuenta | "error" | undefined
}

/**
 * Reenvía el correo de activación. Solo se habilita si la cuenta está
 * pendiente de activación (`estado-cuenta` de auth-center).
 */
export function ResendActivationEmailAction({ employee, estado }: ResendActivationEmailActionProps) {
  const { notify } = useNotify()
  const correo = employee.email?.trim()
  const reenviar = useReenviarActivacion({
    mutationConfig: {
      onSuccess: () => {
        notify(`Se envió el correo de activación a ${correo}.`)
      },
      onError: (error) => {
        notify(getErrorMessage(error), { variant: "error" })
      },
    },
  })

  let disabledReason: string | undefined
  if (!correo) disabledReason = SIN_CORREO
  else if (estado === "error") disabledReason = "No se pudo consultar el estado de la cuenta"
  else if (estado === undefined) disabledReason = "Consultando el estado de la cuenta…"
  else if (estado !== "PENDING_ACTIVATION") disabledReason = MOTIVO_NO_DISPONIBLE[estado]

  return (
    <ConfirmEmailAction
      label="Reenviar correo de activación"
      icon={<EnvelopeIcon />}
      title="Reenviar activación"
      description={
        <>
          Se reenviará el correo de activación de la cuenta de {employee.name} a{" "}
          <strong>{correo}</strong>.
        </>
      }
      disabledReason={disabledReason}
      onConfirm={() => reenviar.mutateAsync({ correo })}
    />
  )
}
