import preview from "../../../../.storybook/preview"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/overlay/popover"

const meta = preview.meta({
  title: "Design System/Overlays/Popover",
  component: Popover,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Open popover</PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Dimensions</PopoverTitle>
          <PopoverDescription>Set the dimensions for the layer.</PopoverDescription>
        </PopoverHeader>
        <div className="mt-2 flex flex-col gap-2">
          <Label htmlFor="popover-width">Width</Label>
          <Input id="popover-width" defaultValue="100%" />
        </div>
      </PopoverContent>
    </Popover>
  ),
})

export const AlignStart = meta.story({
  render: () => (
    <Popover>
      <PopoverTrigger render={<Button variant="outline" />}>Open (align start)</PopoverTrigger>
      <PopoverContent align="start">
        <PopoverTitle>Aligned to start</PopoverTitle>
      </PopoverContent>
    </Popover>
  ),
})
