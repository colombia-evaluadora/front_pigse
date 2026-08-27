import { chromium } from "playwright"

const shotDir =
  "C:/Users/ADMINI~1/AppData/Local/Temp/claude/c--Users-Administrador-Desktop-front-colombia-evaluadora/d777186a-ffca-46e1-bced-f82277d3769b/scratchpad"

const browser = await chromium.launch()
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()

const errors = []
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text())
})
page.on("pageerror", (err) => errors.push(String(err)))

await page.goto("http://localhost:5173/login")
await page.waitForTimeout(1000)

// Login via mock auth
await page.locator("#email").fill("admin@example.com")
await page.locator("#password").fill("password")
await page.getByRole("button", { name: "Ingresar" }).click()

await page.waitForTimeout(1500)
await page.screenshot({ path: `${shotDir}/01-after-login.png`, fullPage: true })

// Open assistant sheet: icon button in header, before ModeToggle
await page.getByRole("button", { name: "Abrir asistente" }).click()

await page.waitForTimeout(500)
await page.getByText("Asistente", { exact: true }).waitFor({ timeout: 5000 })
await page.waitForTimeout(500)
await page.screenshot({ path: `${shotDir}/02-sheet-opened.png`, fullPage: true })

// Send a message
const input = page.getByPlaceholder("Escribe un mensaje...")
await input.fill("hola")
await page.getByLabel("Enviar mensaje").click()
await page.waitForTimeout(300)
await page.screenshot({ path: `${shotDir}/03-after-send-immediate.png`, fullPage: true })
await page.waitForTimeout(2500)
await page.screenshot({ path: `${shotDir}/04-after-fallback-response.png`, fullPage: true })

// Narrow viewport
await page.setViewportSize({ width: 375, height: 700 })
await page.waitForTimeout(500)
await page.screenshot({ path: `${shotDir}/05-narrow-viewport.png`, fullPage: true })

console.log("CONSOLE_ERRORS:", JSON.stringify(errors))

await browser.close()
