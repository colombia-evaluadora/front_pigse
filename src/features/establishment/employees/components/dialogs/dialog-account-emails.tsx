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
 * Restablecer solo tiene sentido si la cuenta SSO existe y no está inactiva.
 * Mientras el estado carga o si la consulta falla el botón queda habilitado:
 * el backend responde de forma controlada, así que degrada bien.
 */
function resetDisabledReason(
  correo: string | undefined,
  estado: EstadoCuenta | "error" | undefined,
): string | undefined {
  if (!correo) return SIN_CORREO
  if (estado === "NOT_FOUND") return "El funcionario aún no tiene cuenta; envíale la invitación"
  if (estado === "INACTIVE") return "La cuenta está inactiva"
  return undefined
}

/**
 * Envía el correo de "olvidé mi contraseña" al funcionario, reusando el
 * mismo endpoint público del login (`GET /sso-admin/forgotPassword`, con
 * `app` = la app de PIGSE vía `env.NAME`).
 */
export function ResetPasswordEmailAction({
  employee,
  estado,
}: {
  employee: EmployeeListItem
  /** `undefined` mientras carga; `"error"` si la consulta falló. */
  estado: EstadoCuenta | "error" | undefined
}) {
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
      disabledReason={resetDisabledReason(correo, estado)}
      onConfirm={() => forgotPassword.mutateAsync(correo)}
    />
  )
}

const MOTIVO_NO_DISPONIBLE: Record<Exclude<EstadoCuenta, "PENDING_ACTIVATION" | "NOT_FOUND">, string> = {
  ACTIVE: "La cuenta ya está activa; usa restablecer contraseña",
  INACTIVE: "La cuenta está inactiva",
}

const INVITE_LABEL = "Enviar invitación para crear la cuenta"

interface ResendActivationEmailActionProps {
  employee: EmployeeListItem
  /** `undefined` mientras carga; `"error"` si la consulta falló. */
  estado: EstadoCuenta | "error" | undefined
}

/**
 * Reenvía el correo de activación si la cuenta está pendiente, o invita al
 * funcionario si aún no tiene cuenta SSO (`NOT_FOUND`): en ese caso el
 * backend crea la cuenta pendiente y envía la invitación.
 */
export function ResendActivationEmailAction({ employee, estado }: ResendActivationEmailActionProps) {
  const { notify } = useNotify()
  const correo = employee.email?.trim()
  const isInvite = estado === "NOT_FOUND"
  const reenviar = useReenviarActivacion({
    mutationConfig: {
      onSuccess: () => {
        notify(
          isInvite
            ? `Se envió la invitación a ${correo}.`
            : `Se envió el correo de activación a ${correo}.`,
        )
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
  else if (estado !== "PENDING_ACTIVATION" && estado !== "NOT_FOUND") disabledReason = MOTIVO_NO_DISPONIBLE[estado]

  return (
    <ConfirmEmailAction
      label={isInvite ? INVITE_LABEL : "Reenviar correo de activación"}
      icon={<EnvelopeIcon />}
      title={isInvite ? INVITE_LABEL : "Reenviar activación"}
      description={
        isInvite ? (
          <>
            Se creará la cuenta de {employee.name} y se enviará la invitación para activarla a{" "}
            <strong>{correo}</strong>.
          </>
        ) : (
          <>
            Se reenviará el correo de activación de la cuenta de {employee.name} a{" "}
            <strong>{correo}</strong>.
          </>
        )
      }
      disabledReason={disabledReason}
      onConfirm={() => reenviar.mutateAsync({ correo })}
    />
  )
}
