import preview from "../../../../.storybook/preview"
import { Toggle } from "@/components/ui/toggle"

const meta = preview.meta({
  title: "Design System/Forms/Toggle",
  component: Toggle,
  tags: ["autodocs"],
  args: { children: "Toggle" },
})

export const Default = meta.story({})
export const Outline = meta.story({ args: { variant: "outline" } })
export const Small = meta.story({ args: { size: "sm" } })
export const Large = meta.story({ args: { size: "lg" } })
export const Disabled = meta.story({ args: { disabled: true } })
