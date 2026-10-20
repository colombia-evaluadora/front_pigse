import { defineConfig, devices } from "@playwright/test"

/**
 * Smoke E2E contra el ambiente REAL de test (no MSW, no localhost).
 *
 * Es el gate antes de cualquier release de PIGSE a producción: los bugs que
 * motivaron esta suite (VARCHAR(30) que no aceptaba
 * PROYECTO_EDUCATIVO_INSTITUCIONAL, la página que se caía con el traductor
 * del navegador, una columna `users.username` inventada) solo se ven
 * contra el backend y la base de datos de verdad.
 *
 * Credenciales SOLO por variables de entorno (ver `e2e/env.ts` y el README).
 */
const baseURL = process.env.PIGSE_E2E_BASE_URL ?? "https://test.pigse.com"

// Esta suite escribe datos reales: nunca debe apuntar a producción.
const host = new URL(baseURL).hostname
if (!/^test\.|^localhost$|^127\.0\.0\.1$/.test(host)) {
  throw new Error(
    `PIGSE_E2E_BASE_URL=${baseURL}: la suite E2E hace escrituras reales y solo corre contra test (test.*) o localhost.`,
  )
}

export default defineConfig({
  testDir: "./e2e",
  // Escrituras reales sobre el mismo establecimiento: en serie, sin carreras.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "test-results",
  use: {
    baseURL,
    locale: "es-CO",
    timezoneId: "America/Bogota",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
})
