import { Link, useNavigate } from "@tanstack/react-router"
import { ArrowLeftIcon, ArrowRightIcon, PasswordIcon, ShieldIcon } from "@/components/ui/icons"

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

import { useForgotPassword } from "@/features/auth/api/mutations/forgot-password"
import { ForgotPasswordForm } from "@/features/auth/components/forms/form-forgot-password"
import type { ForgotPasswordFormValues } from "@/features/auth/api/schema"

const FORGOT_PASSWORD_FORM_ID = "forgot-password-form"

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const forgotPasswordMutation = useForgotPassword()

  function handleSubmit(values: ForgotPasswordFormValues) {
    forgotPasswordMutation.mutate(values.email, {
      onSettled: (data) =>
        navigate({
          to: paths.auth.checkEmail.path,
          search: { token: data?.token },
        }),
    })
  }

  return (
    <>
      <CardHeader className="text-center">
        <div className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
          <PasswordIcon className="text-primary size-7" aria-hidden="true" />
        </div>
        <CardTitle>Olvidaste tu contraseña</CardTitle>
        <CardDescription>
          Ingresa tu correo electrónico y te enviaremos instrucciones para restablecer tu
          contraseña.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <ForgotPasswordForm id={FORGOT_PASSWORD_FORM_ID} onSubmit={handleSubmit} />
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button
          type="submit"
          color="primary"
          form={FORGOT_PASSWORD_FORM_ID}
          disabled={forgotPasswordMutation.isPending}
          className="w-full"
        >
          Enviar instrucciones
          {forgotPasswordMutation.isPending ? (
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
  )
}
