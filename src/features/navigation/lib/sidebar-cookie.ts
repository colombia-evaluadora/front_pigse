// Must match the cookie name hardcoded inside src/components/ui/sidebar.tsx
// (SIDEBAR_COOKIE_NAME) — that constant isn't exported.
const SIDEBAR_COOKIE_NAME = "sidebar_state"

export function getInitialSidebarOpen(): boolean {
  const match = document.cookie.match(new RegExp(`${SIDEBAR_COOKIE_NAME}=([^;]+)`))
  return match ? match[1] === "true" : true
}
