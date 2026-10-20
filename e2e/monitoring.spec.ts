import { adminCredentials, requireAdmin } from "./env"
import { expect, login, settle, test } from "./fixtures"

test.skip(!adminCredentials, "Faltan PIGSE_TEST_USER / PIGSE_TEST_PASS")

test("monitoreo: tablero y detalle documental con el documento principal primero", async ({ page, problems: _ }) => {
  await login(page, requireAdmin())
  await page.goto("/app/monitoreo-cumplimiento")
  await settle(page)

  // Las celdas de estado (PEI/PEC/PMI/PFI) por establecimiento llevan al detalle.
  const cells = page.getByRole("link", { name: /^(PEI|PEC) de .*Ver documentos$/ })
  await expect(cells.first(), "el tablero debería listar establecimientos con PEI/PEC").toBeVisible()
  const label = (await cells.first().getAttribute("aria-label")) ?? ""
  const type = label.slice(0, 3)
  await cells.first().click()

  await page.waitForURL(/monitoreo-cumplimiento\/detalle\/\d+\//)
  await settle(page)
  await expect(page.getByRole("progressbar", { name: "Archivos obligatorios cargados" })).toBeVisible()

  // El primer anexo listado es el documento principal ("Documento PEI…"/"Documento PEC…").
  const headings = page.getByRole("heading", { level: 3 })
  const principal = type === "PEI" ? "PROYECTO_EDUCATIVO_INSTITUCIONAL" : "PROYECTO_EDUCATIVO_COMUNITARIO"
  await expect(headings.first()).toHaveAttribute("id", `anexo-${principal}`)
})
