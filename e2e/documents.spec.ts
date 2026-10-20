import type { Page } from "@playwright/test"

import { rectorCredentials } from "./env"
import { dummyPdf, expect, login, settle, test } from "./fixtures"

/**
 * Gestión documental con ESCRITURAS REALES. Gestión documental es siempre
 * sobre el establecimiento propio del usuario (el backend responde "no está
 * vinculado a exactamente un establecimiento" a un super admin), así que
 * necesita una cuenta vinculada a un EE de prueba que se pueda modificar:
 * `PIGSE_TEST_RECTOR_USER` / `PIGSE_TEST_RECTOR_PASS`.
 *
 * No hay "borrar documento" en la app (un obligatorio se reemplaza, nunca se
 * deja vacío), así que la limpieza es implícita: cada corrida REEMPLAZA los
 * archivos de la anterior con PDFs dummy nombrados `e2e-*`.
 */
test.skip(!rectorCredentials, "Falta PIGSE_TEST_RECTOR_USER / PIGSE_TEST_RECTOR_PASS (cuenta vinculada a un EE de prueba)")

const TYPES = ["PEI", "PEC", "PMI", "PFI"] as const

async function openDetail(page: Page, type: (typeof TYPES)[number]) {
  await page.goto(`/app/gestion-documental/${type}`)
  await settle(page)
}

for (const type of TYPES) {
  test(`${type}: guardar el documento completo con todos los anexos obligatorios`, async ({ page, problems: _ }) => {
    await login(page, rectorCredentials!)
    await openDetail(page, type)

    const action = page.getByRole("button", { name: /^(Cargar|Editar) documento$/ })
    // PEI/PEC y PMI/PFI son excluyentes según la modalidad del EE (NO_APLICA):
    // el tipo que no aplica no ofrece carga.
    if ((await action.count()) === 0) {
      test.skip(true, `${type} no aplica a este establecimiento (NO_APLICA)`)
    }
    await action.click()

    const dialog = page.getByRole("dialog")
    await expect(dialog).toBeVisible()
    const save = dialog.getByRole("button", { name: "Guardar documento" })
    const status = dialog.getByRole("status")

    // Sin cambios nunca se puede guardar.
    await expect(save).toBeDisabled()

    // Un bloque por anexo (hijos directos de la lista; los archivos son <li> anidados).
    // No se filtra por el input: al elegir archivo el dropzone desaparece.
    const blocks = dialog.locator("ul").first().locator(":scope > li")
    const required = blocks.filter({ hasText: "Obligatorio" })
    const requiredCount = await required.count()
    expect(requiredCount, "todo documento tiene al menos el documento principal").toBeGreaterThan(0)
    // El documento principal va primero (V588).
    if (type === "PEI" || type === "PEC") {
      await expect(blocks.first()).toContainText(`Documento ${type}`)
    }

    // Bloqueo: con un obligatorio sin archivo, "Guardar" queda deshabilitado.
    // Solo se puede probar si el documento todavía no está completo (una
    // corrida previa ya lo completó y un obligatorio no se puede vaciar); en
    // ese caso se prueba con el formulario sin tocar.
    const uncovered = required.filter({ hasNotText: "Vigente" })
    if ((await uncovered.count()) > 0 && requiredCount > 1) {
      for (let i = 1; i < requiredCount; i++) {
        await required.nth(i).locator("input[type='file']").setInputFiles(dummyPdf(`e2e-${type}-${i}.pdf`))
      }
      await expect(save).toBeDisabled()
      await expect(status).toContainText(/falta|Falta|obligatori/i)
    }

    // Todos los obligatorios (incluido el documento principal, el primero).
    for (let i = 0; i < requiredCount; i++) {
      const input = required.nth(i).locator("input[type='file']")
      if ((await input.count()) > 0) await input.setInputFiles(dummyPdf(`e2e-${type}-${i}.pdf`))
    }
    await expect(status).toContainText("tienen archivo")
    await expect(save).toBeEnabled()

    await save.click()
    await expect(dialog).toBeHidden({ timeout: 60_000 })

    // El listado refleja la carga: el botón pasa a "Editar" y el texto a completo.
    await expect(page.getByRole("button", { name: "Editar documento" })).toBeVisible()
    await expect(page.getByText("Documento completo.")).toBeVisible()
    await expect(page.getByText(`e2e-${type}-0.pdf`).first()).toBeVisible()

    // Y el listado general muestra el tipo como completo.
    await page.goto("/app/gestion-documental")
    await settle(page)
    await expect(page.getByRole("row").filter({ hasText: type }).first()).toContainText(/Complet|Entregado/i)
  })
}
