import * as React from "react"

import { useUser } from "@/lib/auth"
import type { Role } from "@/types/api"

export const ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const

export function useAuthorization() {
  const user = useUser()

  if (!user.data) {
    throw new Error("User does not exist!")
  }

  const checkAccess = React.useCallback(
    ({ allowedRoles }: { allowedRoles: Role[] }) => {
      if (allowedRoles && allowedRoles.length > 0) {
        return allowedRoles.includes(user.data!.role)
      }
      return true
    },
    [user.data],
  )

  return { checkAccess, role: user.data.role }
}

type AuthorizationProps = {
  forbiddenFallback?: React.ReactNode
  children: React.ReactNode
} & ({ allowedRoles: Role[]; policyCheck?: never } | { allowedRoles?: never; policyCheck: boolean })

export function Authorization({
  policyCheck,
  allowedRoles,
  forbiddenFallback = null,
  children,
}: AuthorizationProps) {
  const { checkAccess } = useAuthorization()

  let canAccess = false

  if (allowedRoles) {
    canAccess = checkAccess({ allowedRoles })
  }

  if (typeof policyCheck !== "undefined") {
    canAccess = policyCheck
  }

  return <>{canAccess ? children : forbiddenFallback}</>
}
