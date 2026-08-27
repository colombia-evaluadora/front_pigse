import preview from "../../../../.storybook/preview"
import { Kbd, KbdGroup } from "@/components/ui/kbd"

const meta = preview.meta({
  title: "Design System/Data Display/Kbd",
  component: Kbd,
  tags: ["autodocs"],
})

export const Default = meta.story({
  args: { children: "⌘" },
})

export const Group = meta.story({
  render: () => (
    <KbdGroup>
      <Kbd>⌘</Kbd>
      <Kbd>Shift</Kbd>
      <Kbd>P</Kbd>
    </KbdGroup>
  ),
})
