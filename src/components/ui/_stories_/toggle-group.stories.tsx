import preview from "../../../../.storybook/preview"
import { TextBIcon, TextItalicIcon, TextUnderlineIcon } from "@/components/ui/icons"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const meta = preview.meta({
  title: "Design System/Forms/ToggleGroup",
  component: ToggleGroup,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <ToggleGroup defaultValue={["bold"]}>
      <ToggleGroupItem value="bold" aria-label="Bold">
        <TextBIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <TextItalicIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="underline" aria-label="Underline">
        <TextUnderlineIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
})

export const Outline = meta.story({
  render: () => (
    <ToggleGroup variant="outline" defaultValue={["bold"]}>
      <ToggleGroupItem value="bold" aria-label="Bold">
        <TextBIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <TextItalicIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
})

export const Vertical = meta.story({
  render: () => (
    <ToggleGroup orientation="vertical" defaultValue={["bold"]}>
      <ToggleGroupItem value="bold" aria-label="Bold">
        <TextBIcon />
      </ToggleGroupItem>
      <ToggleGroupItem value="italic" aria-label="Italic">
        <TextItalicIcon />
      </ToggleGroupItem>
    </ToggleGroup>
  ),
})
