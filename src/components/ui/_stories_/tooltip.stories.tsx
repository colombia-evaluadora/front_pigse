import preview from "../../../../.storybook/preview"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/overlay/tooltip"

const meta = preview.meta({
  title: "Design System/Overlays/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger render={<Button variant="outline" />}>Hover me</TooltipTrigger>
        <TooltipContent>Add to library</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
})
