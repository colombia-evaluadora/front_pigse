import type { TestRunnerConfig } from "@storybook/test-runner"
import { checkA11y, injectAxe } from "axe-playwright"

// Reglas de axe que ignoramos por ser falsos positivos del entorno Storybook.
// Documentar el porqué de cada exclusión para que sea fácil revisar más adelante.
const DISABLED_RULES = [
  // En Storybook las páginas se renderizan dentro de iframes con foco aislado;
  // el "page-has-heading-one" y "region" fallan por la estructura del shell,
  // no del componente testeado.
  "region",
]

const config: TestRunnerConfig = {
  // Inyecta axe-core en cada página antes de la visita.
  async preVisit(page) {
    await injectAxe(page)
  },

  // Después de cada story, corre axe contra el contenido real.
  async postVisit(page, context) {
    // Solo correr a11y en historias del Design System.
    if (!context.title?.startsWith("Design System")) return

    // Las matrices (`Variants`) son para revisión visual, no para testing —
    // axe contra 40 botones a la vez genera ruido y falsos positivos.
    if (context.name === "Variants") return

    // Detectar el theme activo desde el DOM:
    // - `colorTheme` viene del `data-color-theme` que aplica `withColorTheme`
    // - `mode` viene de la clase `.dark` que aplica `storybook-dark-mode`
    // TestContext no expone `globals`, así que leemos del HTML directamente.
    const { colorTheme, mode } = await page.evaluate(() => ({
      colorTheme: document.documentElement.getAttribute("data-color-theme") ?? "default",
      mode: document.documentElement.classList.contains("dark") ? "dark" : "light",
    }))

    console.log(`[a11y] ${context.id} — palette=${colorTheme} mode=${mode}`)

    await checkA11y(
      page,
      "#storybook-root",
      {
        // Solo fallamos por violaciones críticas/serias; las moderadas y
        // menores se reportan en `a11y.report.html` sin frenar el build.
        includedImpacts: ["critical", "serious"],
        axeOptions: {
          // `rules` pertenece a `RunOptions` (de axe-core), no a AxeOptions
          // directamente. Hay que anidarlo bajo `axeOptions`.
          rules: DISABLED_RULES.reduce(
            (acc, rule) => ({ ...acc, [rule]: { enabled: false } }),
            {} as Record<string, { enabled: boolean }>,
          ),
        },
      },
      false,
      "a11y.report.html",
    )
  },
}

export default config
