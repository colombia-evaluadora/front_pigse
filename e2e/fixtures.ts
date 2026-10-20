import { test as base, expect, type Page } from "@playwright/test"

import type { Credentials } from "./env"

/**
 * Errores "esperados" que no deben tumbar la suite. Cada entrada documenta
 * POR QUÉ es esperada; agregá acá solo lo que la app maneja a propósito.
 */
const EXPECTED_HTTP: { method?: string; url: RegExp; status: number; why: string }[] = [
  // Sin cookie `sso_refresh` el arranque sondea la sesión y el backend
  // responde 401: es como la app sabe que tiene que mostrar el login.
  { method: "POST", url: /\/api\/auth\/refresh$/, status: 401, why: "sondeo de sesión sin cookie" },
]

const EXPECTED_CONSOLE: RegExp[] = [
  // El navegador loguea cada respuesta 4xx/5xx como error de consola; esas
  // ya las juzga el colector de red (con su propia lista de esperadas).
  /Failed to load resource: the server responded with a status of/,
]

export interface Problem {
  kind: "console" | "pageerror" | "http" | "requestfailed"
  detail: string
}

export class ProblemCollector {
  readonly problems: Problem[] = []
  /** Permite que una prueba declare un error puntual como esperado. */
  private allowed: { url: RegExp; status: number }[] = []

  allowHttp(url: RegExp, status: number) {
    this.allowed.push({ url, status })
  }

  attach(page: Page) {
    page.on("console", (msg) => {
      if (msg.type() !== "error") return
      const text = msg.text()
      if (EXPECTED_CONSOLE.some((re) => re.test(text))) return
      this.problems.push({ kind: "console", detail: text })
    })
    page.on("pageerror", (error) => {
      this.problems.push({ kind: "pageerror", detail: `${error.name}: ${error.message}` })
    })
    page.on("response", (response) => {
      const status = response.status()
      if (status < 400) return
      const url = response.url()
      const method = response.request().method()
      if (EXPECTED_HTTP.some((e) => e.status === status && e.url.test(url) && (!e.method || e.method === method))) return
      if (this.allowed.some((a) => a.status === status && a.url.test(url))) return
      this.problems.push({ kind: "http", detail: `${method} ${url} → ${status} (en ${page.url()})` })
    })
    page.on("requestfailed", (request) => {
      const failure = request.failure()?.errorText ?? ""
      // Navegar/cerrar cancela requests en vuelo: no es un error del backend.
      if (/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(failure)) return
      this.problems.push({ kind: "requestfailed", detail: `${request.method()} ${request.url()} (${failure})` })
    })
  }

  format() {
    return this.problems.map((p) => `[${p.kind}] ${p.detail}`).join("\n")
  }
}

export const test = base.extend<{ problems: ProblemCollector }>({
  problems: async ({ page }, use, testInfo) => {
    const collector = new ProblemCollector()
    collector.attach(page)
    await use(collector)
    if (collector.problems.length > 0) {
      await testInfo.attach("problemas.txt", { body: collector.format(), contentType: "text/plain" })
    }
    expect(collector.problems, `Errores de consola/red inesperados:\n${collector.format()}`).toEqual([])
  },
})

export { expect }

/** Login real por la UI. Deja la página en `/app/...`. */
export async function login(page: Page, { user, pass }: Credentials) {
  await page.goto("/login")
  await page.getByLabel("Correo electrónico").fill(user)
  await page.getByLabel("Contraseña", { exact: true }).fill(pass)
  await page.getByRole("button", { name: "Ingresar" }).click()
  await page.waitForURL(/\/app(\/|$)/)
  await expectNoErrorBoundary(page)
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: "Cuenta de usuario" }).click()
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click()
  await page.waitForURL(/\/login/)
}

/** El error boundary del router pinta "Algo salió mal": nunca debería verse. */
export async function expectNoErrorBoundary(page: Page) {
  await expect(page.getByRole("heading", { name: "Algo salió mal" })).toHaveCount(0)
}

/** Espera a que la página termine de cargar datos (sin spinners/requests). */
export async function settle(page: Page) {
  // `networkidle` puede no llegar nunca (polling, websockets del dev server):
  // es una espera de cortesía, no una aserción.
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {})
  await expectNoErrorBoundary(page)
}

/** PDF mínimo válido (una página en blanco) para las cargas. */
export function dummyPdf(name: string) {
  const body = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj
trailer<</Root 1 0 R>>
%%EOF
`
  return { name, mimeType: "application/pdf", buffer: Buffer.from(body) }
}
