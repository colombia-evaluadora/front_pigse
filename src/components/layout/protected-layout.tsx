import { Outlet } from "@tanstack/react-router"

import { AppSidebar } from "@/features/navigation/components/app-sidebar"
import { NavUser } from "@/features/navigation/components/nav-user"
import { getInitialSidebarOpen } from "@/features/navigation/lib/sidebar-cookie"
import { Separator } from "@/components/ui/separator"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/navigation/sidebar"
import { Button } from "@/components/ui/button"
import { BellIcon } from "@/components/ui/icons"
import { AppBreadcrumb } from "@/components/layout/app-breadcrumb"
import { ColorThemeToggle } from "@/components/color-theme-toggle"
import { ModeToggle } from "@/components/mode-toggle"

export function ProtectedLayout() {
  return (
    <SidebarProvider defaultOpen={getInitialSidebarOpen()}>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 bg-sidebar px-4">
          {/*
            En escritorio el trigger vive junto al logo, dentro del sidebar. En
            móvil no puede: ahí el sidebar es un `Sheet` cerrado, así que el
            botón que lo abre tiene que quedar fuera de él.
          */}
          <div className="flex items-center gap-2 md:hidden">
            <SidebarTrigger />
            <Separator orientation="vertical" className="my-auto h-4" />
          </div>

          <div className="flex min-w-0 flex-1 justify-center">
            <AppBreadcrumb />
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <ColorThemeToggle />
            <Separator orientation="vertical" className="my-auto h-4" />
            <Button
              variant="outline"
              size="icon"
              color="muted"
              aria-label="Notificaciones"
              className="bg-background"
            >
              <BellIcon />
            </Button>
            <NavUser />
          </div>
        </header>
        {/*
          `flex flex-col` para que la card de contenido de cada página pueda
          estirarse (`grow`) hasta el borde inferior cuando la tabla es corta.
          Sin esto quedaba una franja de `bg-sidebar` bajo la card.
        */}
        {/*
          El aire de la izquierda lo pone el sidebar mientras ocupa lugar. Bajo
          `md` se convierte en overlay y desaparece del flujo, así que ahí el
          contenedor tiene que poner su propio `pl-4` —si no, las cards quedan
          pegadas al borde de la pantalla—. El breakpoint es el mismo que usa
          `useIsMobile` (768px) para decidir el modo drawer.
        */}
        <div className="flex min-w-0 flex-1 flex-col pr-4 pb-4 max-md:pl-4 bg-sidebar">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
