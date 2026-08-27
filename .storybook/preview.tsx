/// <reference types="vite/client" />
import { useEffect, type ReactNode } from "react"
import { definePreview } from "@storybook/react-vite"
import addonA11y from "@storybook/addon-a11y"
import addonDocs from "@storybook/addon-docs"
import "../src/index.css"

type Palette = "default-light" | "default-dark" | "red-light" | "red-dark"

const ThemeApplier = ({ palette, children }: { palette: Palette; children: ReactNode }) => {
  // Mismo contrato que la app (`src/components/theme-provider.tsx`):
  // la paleta va en `data-theme` ('red' o ausente = default) y el modo
  // en la clase `.dark` — que es de la que depende el
  // `@custom-variant dark (&:is(.dark *))` de `index.css`.
  useEffect(() => {
    const root = document.documentElement
    const [color, mode] = palette.split("-")

    if (color === "default") {
      root.removeAttribute("data-theme")
    } else {
      root.setAttribute("data-theme", color)
    }
    root.classList.toggle("dark", mode === "dark")

    return () => {
      root.removeAttribute("data-theme")
      root.classList.remove("dark")
    }
  }, [palette])

  return <>{children}</>
}

const withTheme = (
  Story: () => React.ReactElement,
  context: { globals: { palette?: Palette } },
) => {
  const palette: Palette = context.globals.palette ?? "default-light"
  return (
    <ThemeApplier palette={palette}>
      <Story />
    </ThemeApplier>
  )
}

export const preview = definePreview({
  addons: [addonA11y(), addonDocs()],
  parameters: {
    darkMode: {
      default: "light",
      apply: false,
      stylePreview: true,
    },
    a11y: {
      test: "todo",
    },
  },
  globalTypes: {
    palette: {
      name: "Palette",
      description: "Paleta de colores",
      defaultValue: "default-light",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "default-light", title: "Default · Light" },
          { value: "default-dark", title: "Default · Dark" },
          { value: "red-light", title: "Red · Light" },
          { value: "red-dark", title: "Red · Dark" },
        ],
      },
    },
  },
  decorators: [withTheme],
})

export default preview
