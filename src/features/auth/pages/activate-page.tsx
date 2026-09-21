import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockCountdownIcon,
  LinkBreakIcon,
  PasswordIcon,
  ShieldIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"
import { Link, useNavigate, useSearch } from "@tanstack/react-router"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"

import { useActivateAccount } from "@/features/auth/api/mutations/activate-account"
import { useAccountActivationLink } from "@/features/auth/hooks/use-account-activation-link"
import { RestorePasswordForm } from "@/features/auth/components/forms/form-restore-password"
import type { RestorePasswordFormValues } from "@/features/auth/api/schema"

const ACTIVATE_FORM_ID = "activate-account-form"

/**
 * Destino del correo "Activa tu cuenta" (createAccount/resendActivation en
 * sso-admin) — mismo flujo que RestorePasswordPage (token + nueva
 * contraseña), reutilizando su mismo form: la única diferencia real es a
 * qué endpoint se postea (`/activateAccount`, no `/restorePassword`) y el
 * texto de la pantalla.
 */
export function ActivatePage() {
  const navigate = useNavigate()
  const token = useSearch({
    from: "/_auth/activate",
    select: (s) => s.token,
  })

  const { isChecking, isInvalid, isExpired, remainingLabel, ttlLabel } = useAccountActivationLink(token)

  const activateAccountMutation = useActivateAccount({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Cuenta activada. Ya puedes iniciar sesión.")
        navigate({ to: paths.auth.login.path })
      },
    },
  })

  function handleSubmit(values: RestorePasswordFormValues) {
    if (!token) return
    activateAccountMutation.mutate({ token, password: values.password })
  }

  return (
    <>
      {isInvalid ? (
        <>
          <CardHeader className="text-center">
            <div className="relative mx-auto size-20">
              <div className="bg-red/10 flex size-20 items-center justify-center rounded-full">
                <LinkBreakIcon className="text-red size-9" aria-hidden="true" />
              </div>
              <WarningCircleIcon
                weight="fill"
                className="text-red bg-card absolute right-0 bottom-0 size-7 rounded-full"
                aria-hidden="true"
              />
            </div>
            <CardTitle>Enlace inválido</CardTitle>
            <CardDescription>
              Este enlace de activación no es válido. Contacta a tu administrador para que te
              reenvíe la invitación.
            </CardDescription>
          </CardHeader>
        </>
      ) : isExpired ? (
        <>
          <CardHeader className="text-center">
            <div className="relative mx-auto size-20">
              <div className="bg-red/10 flex size-20 items-center justify-center rounded-full">
                <ClockCountdownIcon className="text-red size-9" aria-hidden="true" />
              </div>
              <WarningCircleIcon
                weight="fill"
                className="text-red bg-card absolute right-0 bottom-0 size-7 rounded-full"
                aria-hidden="true"
              />
            </div>
            <CardTitle>El enlace expiró</CardTitle>
            <CardDescription>
              Por seguridad, los enlaces de activación vencen
              {ttlLabel === null ? "" : ` a los ${ttlLabel}`}. Contacta a tu administrador para
              que te reenvíe la invitación.
            </CardDescription>
          </CardHeader>
        </>
      ) : isChecking ? (
        <CardContent className="flex justify-center py-10">
          <Spinner className="size-6" />
        </CardContent>
      ) : (
        <>
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
              <PasswordIcon className="text-primary size-7" aria-hidden="true" />
            </div>
            <CardTitle>Activa tu cuenta</CardTitle>
            <CardDescription>
              Elige la contraseña con la que vas a ingresar de ahora en adelante.
              {remainingLabel !== null && (
                <>
                  <br />
                  Este enlace vence en{" "}
                  <span className="font-semibold tabular-nums" aria-live="polite">
                    {remainingLabel}
                  </span>
                </>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <RestorePasswordForm id={ACTIVATE_FORM_ID} onSubmit={handleSubmit} />
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button
              type="submit"
              color="primary"
              form={ACTIVATE_FORM_ID}
              disabled={activateAccountMutation.isPending}
              className="w-full"
            >
              Activar cuenta
              {activateAccountMutation.isPending ? (
                <Spinner data-icon="inline-end" />
              ) : (
                <ArrowRightIcon data-icon="inline-end" />
              )}
            </Button>

            <Button
              render={<Link to={paths.auth.login.path} />}
              nativeButton={false}
              variant="ghost"
              color="primary"
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Volver a iniciar sesión
            </Button>
            <p className="text-muted-foreground inline-flex items-start text-center text-xs">
              <ShieldIcon className="size-5 shrink-0" aria-hidden="true" />
              Tu seguridad es importante. Nunca compartas tu contraseña con nadie.
            </p>
          </CardFooter>
        </>
      )}
    </>
  )
}
