import { adminCredentials, requireAdmin, resetEmail } from "./env"
import { expect, login, settle, test } from "./fixtures"

test.skip(!adminCredentials, "Faltan PIGSE_TEST_USER / PIGSE_TEST_PASS")

/**
 * Funcionarios. Crear un funcionario dispara la creación/invitación de la
 * cuenta SSO por correo: no se hace desde la suite (ver README). Solo se
 * lista y se manda "restablecer contraseña" a un funcionario de PRUEBA
 * (`@example.com`, nunca un correo real).
 */
test("funcionarios: lista y restablecer contraseña muestra «Correo enviado a…»", async ({ page, problems: _ }) => {
  await login(page, requireAdmin())
  await page.goto("/app/establecimiento-educativo/funcionarios")
  await settle(page)

  const rows = page.getByRole("row").filter({ has: page.getByRole("cell") })
  await expect(rows.first(), "la lista de funcionarios no debería estar vacía").toBeVisible()

  const target = resetEmail ?? "@example.com"
  const row = rows.filter({ hasText: target }).first()
  if ((await row.count()) === 0) {
    test.skip(true, `No hay funcionario de prueba con correo ${target} en la primera página`)
  }
  const email = resetEmail ?? (await row.innerText()).match(/[\w.+-]+@example\.com/)![0]
  expect(email.endsWith("@example.com"), "solo se envían correos a cuentas de prueba").toBe(true)

  await row.hover()
  const reset = row.getByRole("button", { name: "Enviar correo para restablecer contraseña" })
  if ((await reset.count()) === 0) {
    test.skip(true, `El funcionario ${email} no admite restablecer (cuenta inexistente/inactiva)`)
  }
  await reset.click()
  const confirm = page.getByRole("alertdialog")
  await expect(confirm).toContainText(email)
  await confirm.getByRole("button", { name: "Enviar" }).click()

  await expect(page.getByText(`Correo enviado a ${email}`)).toBeVisible()
})
