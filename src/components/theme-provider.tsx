import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"

// Las 4 combinaciones del design system, sincronizadas con Figma.
// Se combinan en dos ejes ortogonales sobre `<html>`: la paleta va en
// `data-theme` ("red" o ausente = default) y el modo en la clase `.dark`
// (next-themes). Es el mismo par de ejes que emiten los selectores de
// `index.css`: `[data-theme='red']` y `.dark[data-theme='red']`.
type Theme = "default-light" | "default-dark" | "red-light" | "red-dark"

type ColorTheme = "default" | "red"
type Mode = "light" | "dark"

type ColorThemeProviderState = {
  theme: Theme
  palette: ColorTheme
  mode: Mode
  setPalette: (palette: ColorTheme) => void
  setMode: (mode: Mode) => void
}

const initialState: ColorThemeProviderState = {
  theme: "default-light",
  palette: "default",
  mode: "light",
  setPalette: () => null,
  setMode: () => null,
}

const ColorThemeProviderContext = createContext<ColorThemeProviderState>(initialState)

function ColorThemeProvider({
  children,
  defaultColorTheme = "default",
  storageKey = "vite-ui-color-theme",
}: {
  children: React.ReactNode
  defaultColorTheme?: ColorTheme
  storageKey?: string
}) {
  const [palette, setPaletteState] = useState<ColorTheme>(
    () => (localStorage.getItem(storageKey) as ColorTheme) || defaultColorTheme,
  )

  const { resolvedTheme } = useTheme()
  const mode: Mode = resolvedTheme === "dark" ? "dark" : "light"

  const theme: Theme = `${palette}-${mode}` as Theme

  // `data-theme` lleva SOLO la paleta ("red"; el default no tiene nombre y
  // se representa quitando el atributo). El modo lo pone `next-themes` con
  // la clase `.dark` en <html> — de la que además depende el
  // `@custom-variant dark (&:is(.dark *))` de `index.css`, así que el modo
  // NO puede vivir en este atributo. Los selectores generados son
  // `[data-theme='red']` y `.dark[data-theme='red']`.
  useEffect(() => {
    const root = window.document.documentElement
    if (palette === "default") {
      root.removeAttribute("data-theme")
    } else {
      root.setAttribute("data-theme", palette)
    }
  }, [palette])

  const value: ColorThemeProviderState = {
    theme,
    palette,
    mode,
    setPalette: (palette) => {
      localStorage.setItem(storageKey, palette)
      setPaletteState(palette)
    },
    setMode: () => {
      // `setMode` lo maneja NextThemesProvider vía `attribute="class"`.
      // Esta función queda como no-op para mantener la API del context.
    },
  }

  return (
    <ColorThemeProviderContext.Provider value={value}>
      {children}
    </ColorThemeProviderContext.Provider>
  )
}

export const useColorTheme = () => {
  const context = useContext(ColorThemeProviderContext)
  if (context === undefined)
    throw new Error("useColorTheme must be used within a ColorThemeProvider")
  return context
}

type ThemeProviderProps = {
  children: React.ReactNode
  defaultColorTheme?: ColorTheme
  storageKey?: string
}

export function ThemeProvider({ children, defaultColorTheme, storageKey }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      // Arranca en claro, no en el modo del sistema: quien quiera seguirlo
      // todavía tiene la opción "Sistema" en el selector de modo.
      defaultTheme="light"
      storageKey="vite-ui-theme"
      enableSystem
      disableTransitionOnChange
    >
      <ColorThemeProvider defaultColorTheme={defaultColorTheme} storageKey={storageKey}>
        {children}
      </ColorThemeProvider>
    </NextThemesProvider>
  )
}
