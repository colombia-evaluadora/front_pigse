import { useState } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  IdentificationCardIcon,
  ShieldIcon,
  UserCircleIcon,
} from "@/components/ui/icons"

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

import { useForgotUsername } from "@/features/auth/api/mutations/forgot-username"
import type { ForgotUsernameResponse } from "@/features/auth/api/types/password-recovery"
import { ForgotUsernameForm } from "@/features/auth/components/forms/form-forgot-username"
import type { ForgotUsernameFormValues } from "@/features/auth/api/schema"

const FORGOT_USERNAME_FORM_ID = "forgot-username-form"

export function ForgotUsernamePage() {
  const [found, setFound] = useState<ForgotUsernameResponse | null>(null)
  const forgotUsernameMutation = useForgotUsername({
    mutationConfig: {
      onSuccess: (data) => setFound(data),
    },
  })

  function handleSubmit(values: ForgotUsernameFormValues) {
    forgotUsernameMutation.mutate(values.document)
  }

  return (
    <>
      {found ? (
        <>
          <CardHeader className="text-center">
            <div className="bg-green/10 mx-auto flex size-20 items-center justify-center rounded-full">
              <UserCircleIcon className="text-green size-9" aria-hidden="true" />
            </div>
            <CardTitle className="text-xl">Este es tu correo</CardTitle>
            <CardDescription>Encontramos la cuenta asociada a ese documento.</CardDescription>
          </CardHeader>

          <CardContent>
            <div className="bg-green/10 flex flex-col items-center gap-1 p-4 text-center">
              <p className="text-muted-foreground text-xs">Ingresa al sistema con</p>
              <p className="text-green text-lg font-semibold break-all">{found.username}</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button
              render={<Link to={paths.auth.login.path} />}
              nativeButton={false}
              color="primary"
              className="w-full"
            >
              Iniciar sesión
            </Button>
            <Button
              render={<Link to={paths.auth.forgotPassword.path} />}
              nativeButton={false}
              variant="link"
              color="secondary"
            >
              Tampoco recuerdo mi contraseña
            </Button>
          </CardFooter>
        </>
      ) : (
        <>
          <CardHeader className="text-center">
            <div className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
              <IdentificationCardIcon
                weight="duotone"
                className="text-primary size-7"
                aria-hidden="true"
              />
            </div>
            <CardTitle>¿No recuerdas tu correo?</CardTitle>
            <CardDescription>
              Ingresa tu número de documento y te decimos con qué correo entras.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <ForgotUsernameForm id={FORGOT_USERNAME_FORM_ID} onSubmit={handleSubmit} />
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <Button
              type="submit"
              color="primary"
              form={FORGOT_USERNAME_FORM_ID}
              disabled={forgotUsernameMutation.isPending}
              className="w-full"
            >
              Consultar correo
              {forgotUsernameMutation.isPending ? (
                <Spinner data-icon="inline-end" />
              ) : (
                <ArrowRightIcon data-icon="inline-end" />
              )}
            </Button>
            {/* Mismo tratamiento que en las otras dos pantallas de
                recuperación: el botón es el mismo, el estilo también. */}
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
