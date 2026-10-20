import { adminCredentials, requireAdmin } from "./env"
import { expect, expectNoErrorBoundary, login, logout, settle, test } from "./fixtures"

test.skip(!adminCredentials, "Faltan PIGSE_TEST_USER / PIGSE_TEST_PASS")

test("guarda del traductor: <html lang=es translate=no>", async ({ page, problems: _ }) => {
  await page.goto("/login")
  const html = page.locator("html")
  await expect(html).toHaveAttribute("lang", "es")
  await expect(html).toHaveAttribute("translate", "no")
  await expect(html).toHaveClass(/notranslate/)
})

test("login, menú, todas las rutas del menú y logout", async ({ page, problems: _ }) => {
  await login(page, requireAdmin())

  // El menú lo arma el backend por rol: tiene que traer ítems.
  const sidebar = page.locator("[data-sidebar='sidebar']").first()
  const links = sidebar.locator("a[href^='/app/']")
  await expect(links.first()).toBeVisible()
  const hrefs = [...new Set(await links.evaluateAll((as) => as.map((a) => a.getAttribute("href")!)))]
  expect(hrefs.length).toBeGreaterThan(0)

  for (const href of hrefs) {
    await test.step(`ruta ${href}`, async () => {
      await page.goto(href)
      await settle(page)
      // Sin acceso significa que el menú ofrece algo que el guard rechaza.
      await expect(page, `${href} redirigió a sin-acceso`).not.toHaveURL(/sin-acceso/)
      await expectNoErrorBoundary(page)
    })
  }

  await logout(page)
  // Cerrar sesión no puede terminar en un toast de error ("Tu sesión no es
  // válida…") por queries que se re-disparan sin token.
  await page.waitForLoadState("networkidle", { timeout: 20_000 }).catch(() => {})
  await expect(page.locator("[data-sonner-toast][data-type='error']")).toHaveCount(0)
  // Sin sesión, /app vuelve al login.
  await page.goto("/app")
  await page.waitForURL(/\/login/)
})
