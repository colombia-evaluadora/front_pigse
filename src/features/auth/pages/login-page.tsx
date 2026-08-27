import { useEffect } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import { ArrowRightIcon, ShieldLockIcon, ShieldIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import {
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { paths } from "@/config/paths"
import { useLogin } from "@/lib/auth"

import { HelpFaqSheet } from "@/features/auth/components/sheets/sheet-help-faq"
import { LoginForm } from "@/features/auth/components/forms/form-login"
import type { LoginFormValues } from "@/features/auth/api/schema"

const LOGIN_FORM_ID = "login-form"

export function LoginPage() {
  const navigate = useNavigate()
  const search = useSearch({
    from: "/_auth/login",
    select: (s) => s.redirectTo,
  })

  const loginMutation = useLogin()

  useEffect(() => {
    if (loginMutation.isSuccess) {
      navigate({ to: search || paths.app.root.getHref() })
    }
  }, [loginMutation.isSuccess, navigate, search])

  function handleSubmit(values: LoginFormValues) {
    loginMutation.mutate(values)
  }

  return (
    <>
      <CardHeader className="text-center">
        <div className="bg-primary/10 mx-auto flex size-14 items-center justify-center rounded-full">
          <ShieldLockIcon className="text-primary size-7" aria-hidden="true" />
        </div>
        <CardTitle>Iniciar sesión</CardTitle>
        <CardDescription>Accede con tu cuenta institucional.</CardDescription>
      </CardHeader>

      <CardContent>
        <LoginForm id={LOGIN_FORM_ID} onSubmit={handleSubmit} />
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <Button
          type="submit"
          color="primary"
          form={LOGIN_FORM_ID}
          disabled={loginMutation.isPending}
          className="w-full"
        >
          Ingresar
          {loginMutation.isPending ? (
            <Spinner data-icon="inline-end" />
          ) : (
            <ArrowRightIcon data-icon="inline-end" />
          )}
        </Button>
        <div className="flex w-full items-center gap-3">
          <Separator className="flex-1" />
          <HelpFaqSheet />
          <Separator className="flex-1" />
        </div>
        <p className="text-muted-foreground inline-flex items-start text-center text-xs">
          <ShieldIcon className="size-5 shrink-0" aria-hidden="true" />
          Tu seguridad es importante. Nunca compartas tu contraseña con nadie.
        </p>
      </CardFooter>
    </>
  )
}
