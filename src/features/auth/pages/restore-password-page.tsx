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

import { useRestorePassword } from "@/features/auth/api/mutations/restore-password"
import { usePasswordResetLink } from "@/features/auth/hooks/use-password-reset-link"
import { RestorePasswordForm } from "@/features/auth/components/forms/form-restore-password"
import type { RestorePasswordFormValues } from "@/features/auth/api/schema"

const RESTORE_PASSWORD_FORM_ID = "restore-password-form"

export function RestorePasswordPage() {
  const navigate = useNavigate()
  const token = useSearch({
    from: "/_auth/restore-password",
    select: (s) => s.token,
  })

  // El estado del enlace se resuelve antes de mostrar el formulario, para no
  // hacer escribir una contraseña que el submit va a rechazar igual.
  const { isChecking, isInvalid, isExpired, remainingLabel, ttlLabel } = usePasswordResetLink(token)

  const restorePasswordMutation = useRestorePassword({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Contraseña actualizada. Ya puedes iniciar sesión.")
        navigate({ to: paths.auth.login.path })
      },
    },
  })

  function handleSubmit(values: RestorePasswordFormValues) {
    if (!token) return
    restorePasswordMutation.mutate({ token, password: values.password })
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
              Este enlace de recuperación no es válido. Solicita uno nuevo para restablecer tu
              contraseña.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              render={<Link to={paths.auth.forgotPassword.path} />}
              nativeButton={false}
              color="primary"
              className="w-full"
            >
              Solicitar nuevo enlace
            </Button>
          </CardFooter>
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
              Por seguridad, los enlaces de recuperación vencen
              {ttlLabel === null ? "" : ` a los ${ttlLabel}`}. Solicita uno nuevo para continuar.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button
              render={<Link to={paths.auth.forgotPassword.path} />}
              nativeButton={false}
              color="primary"
              className="w-full"
            >
              Solicitar nuevo enlace
            </Button>
          </CardFooter>
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
            <CardTitle>Crea tu nueva contraseña</CardTitle>
            <CardDescription>
              Por tu seguridad, elige una contraseña fácil de recordar para ti, pero difícil de
              descubrir para otros.
              {remainingLabel !== null && (
                <>
                  <br />
                  Este enlace vence en{" "}
                  <span
                    className="font-semibold tabular-nums"
                    // Solo el tiempo se relee; sin esto un lector de
                    // pantalla anunciaría la frase entera cada segundo.
                    aria-live="polite"
                  >
                    {remainingLabel}
                  </span>
                </>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <RestorePasswordForm id={RESTORE_PASSWORD_FORM_ID} onSubmit={handleSubmit} />
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button
              type="submit"
              color="primary"
              form={RESTORE_PASSWORD_FORM_ID}
              disabled={restorePasswordMutation.isPending}
              className="w-full"
            >
              Actualizar contraseña
              {restorePasswordMutation.isPending ? (
                <Spinner data-icon="inline-end" />
              ) : (
                <ArrowRightIcon data-icon="inline-end" />
              )}
            </Button>

            {/* Mismo tratamiento que en "Olvidaste tu contraseña": es el mismo
                botón del mismo flujo, así que no puede cambiar de estilo según
                la pantalla. */}
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
