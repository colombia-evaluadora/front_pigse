import { Link } from "@tanstack/react-router"

import icon from "@/assets/icon.svg"
import logo from "@/assets/logo.svg"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/navigation/sidebar"

import { NavMain } from "@/features/navigation/components/nav-main"

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="pt-4">
        {/*
          El logo es un enlace pelado, no un `SidebarMenuButton`: no es una
          opción del menú, así que no debe pintarse de `sidebar-accent` al pasar
          el puntero ni comportarse como seleccionable.

          Plegado a iconos el rail solo da para una cosa (3rem), y esa cosa es
          la marca: el logotipo se cambia por el isotipo y el trigger se esconde.
          Para volver a desplegar está el peek —al pasar el puntero el sidebar
          asoma y con él reaparece el botón—, que es el mismo gesto con el que
          ya se navega el menú plegado.

          Las dos marcas tienen proporciones MUY distintas y por eso cada una se
          acota por un eje diferente:

            icon.svg  294×406  → 0.72 : 1  (vertical)
            logo.svg 1512×417  → 3.63 : 1  (apaisado)

          El isotipo se acota por ALTO (si se lo mete en una caja cuadrada tipo
          `size-8` se deforma, porque `<img>` usa `object-fit: fill` por defecto).
          El logotipo se acota por ANCHO: fijarle el alto lo hacía crecer a
          ~190px de ancho, que no entran en la fila junto al trigger y terminaba
          empujándolo fuera. En los dos casos `object-contain` es la red de
          seguridad contra el estirado.
        */}
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Link
            to="/app"
            className="flex min-w-0 flex-1 items-center group-data-[collapsible=icon]:flex-none"
          >
            <img
              src={icon}
              alt="PIGSE"
              className="hidden h-8 w-auto max-w-8 shrink-0 object-contain group-data-[collapsible=icon]:block"
            />
            <img
              src={logo}
              alt="PIGSE"
              className="h-auto w-full max-w-[9.5rem] object-contain group-data-[collapsible=icon]:hidden"
            />
          </Link>
          <SidebarTrigger className="shrink-0 group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain />
      </SidebarContent>
    </Sidebar>
  )
}
