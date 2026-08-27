import { Link, useSearch } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  PaperPlaneTiltIcon,
  WarningCircleIcon,
} from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { paths } from "@/config/paths"
import { cn } from "@/lib/utils"

import { usePasswordResetLink } from "@/features/auth/hooks/use-password-reset-link"

export function CheckEmailPage() {
  // El token es el único dato en la URL: el correo, la hora de envío y el
  // tiempo restante salen de consultarlo.
  const token = useSearch({
    from: "/_auth/check-email",
    select: (s) => s.token,
  })
  const { isExpired, isInvalid, maskedEmail, remainingLabel, ttlLabel } =
    usePasswordResetLink(token)

  const isDead = isExpired || (isInvalid && !!token)

  return (
    <>
      <CardHeader className="text-center">
        <div className="relative mx-auto size-20">
          <div
            className={cn(
              "flex size-20 items-center justify-center rounded-full",
              isDead ? "bg-red/10" : "bg-green/10",
            )}
          >
            <PaperPlaneTiltIcon
              className={cn("size-9", isDead ? "text-red" : "text-green")}
              aria-hidden="true"
            />
          </div>
          {isDead ? (
            <WarningCircleIcon
              weight="fill"
              className="text-red bg-card absolute right-0 bottom-0 size-7 rounded-full"
              aria-hidden="true"
            />
          ) : (
            <CheckCircleIcon
              weight="fill"
              className="text-green bg-card absolute right-0 bottom-0 size-7 rounded-full"
              aria-hidden="true"
            />
          )}
        </div>

        <CardTitle className="text-xl">
          {isDead ? "El enlace expiró" : "¡Instrucciones enviadas!"}
        </CardTitle>
        <CardDescription>
          {isDead ? (
            "Por seguridad el enlace dejó de ser válido. Solicita uno nuevo para restablecer tu contraseña."
          ) : (
            <>
              Hemos enviado un correo a
              {maskedEmail ? (
                <>
                  <br />
                  <span className="text-green text-base font-semibold break-all">
                    {maskedEmail}
                  </span>
                </>
              ) : (
                " tu dirección registrada"
              )}
            </>
          )}
        </CardDescription>
      </CardHeader>

      {!isDead && (
        <CardContent className="space-y-4">
          {/* La cuenta regresiva va dentro de la frase, no en un aviso aparte:
              mientras corre reemplaza a la vida total del enlace, que solo se
              muestra si todavía no hay contador. */}
          <p className="text-muted-foreground text-center text-sm">
            Sigue las instrucciones del correo para restablecer tu contraseña.
            {remainingLabel !== null ? (
              <>
                {" "}
                El enlace vence en{" "}
                <span className="text-green font-semibold tabular-nums" aria-live="polite">
                  {remainingLabel}
                </span>
                .
              </>
            ) : ttlLabel !== null ? (
              ` El enlace será válido por ${ttlLabel}.`
            ) : null}
          </p>

          <div className="bg-green/10 flex items-start rounded-lg gap-3 p-4">
            <CheckCircleIcon
              weight="fill"
              className="text-green my-auto size-6 shrink-0"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <p className="text-sm font-semibold">Revisa tu bandeja de entrada</p>
              <p className="text-muted-foreground text-sm">
                Si no encuentras el correo, revisa tu carpeta de spam o correo no deseado.
              </p>
            </div>
          </div>
        </CardContent>
      )}

      <CardFooter className="flex flex-col gap-2">
        {isDead && (
          <Button
            render={<Link to={paths.auth.forgotPassword.path} />}
            nativeButton={false}
            color="primary"
            className="w-full"
          >
            Solicitar un enlace nuevo
          </Button>
        )}

        <Button
          render={<Link to={paths.auth.login.path} />}
          nativeButton={false}
          variant="outline"
          className="w-full"
        >
          <ArrowLeftIcon data-icon="inline-start" />
          Volver al inicio de sesión
        </Button>
      </CardFooter>
    </>
  )
}
