import { PaletteIcon } from "@/components/ui/icons"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/overlay/dropdown-menu"
import { useColorTheme } from "@/components/theme-provider"

export function ColorThemeToggle() {
  const { palette, setPalette } = useColorTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" color="muted" className="bg-background" />}>
        <PaletteIcon className="size-[1.2rem]" />
        <span className="sr-only">Cambiar paleta de color</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={palette} onValueChange={setPalette}>
          <DropdownMenuRadioItem value="default" closeOnClick>
            Default
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="red" closeOnClick>
            Red
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
