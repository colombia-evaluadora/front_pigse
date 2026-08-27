import { SignOutIcon } from "@/components/ui/icons"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { paths } from "@/config/paths"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/overlay/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser, useLogout } from "@/lib/auth"

export function NavUser() {
  const navigate = useNavigate()
  const { data: user, isPending } = useUser()
  const logoutMutation = useLogout({
    mutationConfig: {
      onSuccess: () => {
        toast.success("Sesión cerrada.")
        navigate({ to: paths.auth.login.path })
      },
    },
  })

  if (isPending) {
    return <Skeleton className="size-10 rounded-full" />
  }

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <button
              type="button"
              aria-label="Cuenta"
              className="flex size-8 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          }
        >
          <Avatar className="rounded-lg">
            <AvatarFallback className="rounded-lg">?</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            type="button"
            aria-label="Cuenta de usuario"
            className="flex items-center gap-2 rounded-full p-0 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        }
      >
        <Avatar className="size-10 rounded-full">
          <AvatarFallback className="rounded-full">{user.initials}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" side="bottom" className="min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="size-10 rounded-full">
                <AvatarFallback className="rounded-full">{user.initials}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">{user.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate(undefined)}
          >
            <SignOutIcon data-icon="inline-start" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
