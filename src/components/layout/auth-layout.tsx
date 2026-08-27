import { Link, Outlet } from "@tanstack/react-router"

import loginBg from "@/assets/login.png"
import logo from "@/assets/logo.svg"
import { Card } from "@/components/ui/card"
import { paths } from "@/config/paths"

export function AuthLayout() {
  return (
    <div className="relative bg-navy/5 flex min-h-screen flex-col overflow-hidden p-4">
      <div className="absolute bottom-0 right-0 z-0 h-1/2 w-full overflow-hidden bg-navy">
        <img
          src={loginBg}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover opacity-10"
        />
      </div>
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 px-4">
        <Link to={paths.home.getHref()}>
          <img src={logo} alt="Colombia Evaluadora" className="h-15 w-auto sm:h-20" />
        </Link>

        <Card className="w-full max-w-lg gap-4">
          <Outlet />
        </Card>

        <p className="text-navy-foreground text-center">
          Versión 4.2.1 <span aria-hidden="true">|</span> © 2024 Colombia Evaluadora ETC{" "}
          <span aria-hidden="true">|</span> Todos los derechos reservados.
        </p>
      </div>
    </div>
  )
}
