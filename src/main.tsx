import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import { env } from "@/config/env"
import { AppProvider } from "@/provider"

async function enableMocking() {
  if (!env.ENABLE_API_MOCKING) return
  const { worker } = await import("./mocks/browser")
  return worker.start({
    // El worker intercepta *todo* lo que sale del origen, no solo el API:
    // módulos de Vite, HMR y los assets de los mocks (los PNG de
    // `mocks/db/**/assets`). Con `"error"` a secas, esas peticiones fallaban
    // en cada refresh y rompían las imágenes. Solo reclamamos las rutas del
    // API sin handler —que sí son un mock faltante— y dejamos pasar el resto.
    onUnhandledRequest(request, print) {
      if (new URL(request.url).pathname.startsWith("/api/")) {
        print.error()
      }
    },
  })
}

enableMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <AppProvider />
    </StrictMode>,
  )
})
