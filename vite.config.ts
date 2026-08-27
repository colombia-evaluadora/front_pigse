/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from "vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import path from "path"

import { fileURLToPath } from "node:url"
import { cpSync, existsSync, mkdirSync } from "node:fs"
import { createRequire } from "node:module"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url))

/**
 * Copia a `public/pdfjs/` los assets que pdf.js pide POR HTTP en runtime:
 *
 * - `standard_fonts/` — las métricas de las 14 fuentes estándar del formato
 *   (Helvetica, Times, Courier…). Un PDF puede usarlas sin embeberlas, y sin
 *   estos archivos pdf.js dibuja con una sustituta pero calcula mal los anchos
 *   de la capa de texto: al seleccionar, el resaltado sale corrido.
 * - `cmaps/` — tablas de codificación para PDFs con texto CJK.
 *
 * Van a `public/` y no a un import: son directorios de 16 y 169 archivos que
 * el bundler no puede empaquetar, y pdf.js los pide de a uno según los
 * necesita. Servirlos nosotros (en vez de apuntar a un CDN) mantiene el visor
 * funcionando sin salida a internet.
 *
 * El directorio está en `.gitignore`: se regenera solo en cada arranque y en
 * cada build, así que siempre coincide con la versión instalada de
 * `pdfjs-dist` — que es justo lo que un checkout no puede garantizar.
 */
function pdfjsAssetsPlugin() {
  return {
    name: "pigse:pdfjs-assets",
    buildStart() {
      const require = createRequire(import.meta.url)
      const pdfjsRoot = path.dirname(require.resolve("pdfjs-dist/package.json"))
      const destino = path.resolve(dirname, "public/pdfjs")

      mkdirSync(destino, { recursive: true })
      for (const carpeta of ["standard_fonts", "cmaps"]) {
        const origen = path.join(pdfjsRoot, carpeta)
        if (existsSync(origen)) {
          cpSync(origen, path.join(destino, carpeta), { recursive: true })
        }
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_APP_")
  const apiProxyTarget = env.VITE_APP_API_PROXY_TARGET || "http://localhost:8080"

  return {
    plugins: [
      pdfjsAssetsPlugin(),
      react(),
      tailwindcss(),
      babel({
        presets: [reactCompilerPreset()],
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      // Sin esto, Node bindea a lo que resuelva `localhost` primero y en
      // Windows eso suele ser SOLO `[::1]` (loopback IPv6). El documento
      // principal carga, pero cualquier petición que el navegador resuelva
      // por IPv4 (`127.0.0.1`) recibe ECONNREFUSED — se ve como
      // "localhost rechazó la conexión" en un `<iframe>` o un `<img>` que
      // apunta a `/api/...`. Escuchando en todas las interfaces el problema
      // desaparece para las dos familias.
      host: true,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: false,
        },
      },
    },
    test: {
      projects: [
        {
          extends: true,
          plugins: [
            storybookTest({
              configDir: path.join(dirname, ".storybook"),
            }),
          ],
          test: {
            name: "storybook",
            browser: {
              enabled: true,
              headless: true,
              provider: playwright({}),
              instances: [
                {
                  browser: "chromium",
                },
              ],
            },
          },
        },
      ],
    },
  }
})
