import preview from "../../../../.storybook/preview"
import { CircleIcon } from "@/components/ui/icons"
import { Marker, MarkerContent, MarkerIcon } from "@/components/ui/marker"

const meta = preview.meta({
  title: "Design System/Data Display/Marker",
  component: Marker,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <Marker className="w-72">
      <MarkerIcon>
        <CircleIcon weight="fill" />
      </MarkerIcon>
      <MarkerContent>2024-01-15</MarkerContent>
    </Marker>
  ),
})

export const Separator = meta.story({
  render: () => (
    <Marker variant="separator" className="w-72">
      <MarkerContent>OR</MarkerContent>
    </Marker>
  ),
})

export const Border = meta.story({
  render: () => (
    <Marker variant="border" className="w-72">
      <MarkerContent>Section title</MarkerContent>
    </Marker>
  ),
})
