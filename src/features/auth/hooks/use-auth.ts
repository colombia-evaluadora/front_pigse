import { useUser } from "@/lib/auth"

export function useAuth() {
  const user = useUser()

  return {
    user: user.data ?? null,
    isAuthenticated: !!user.data,
    isPending: user.isPending,
  }
}
