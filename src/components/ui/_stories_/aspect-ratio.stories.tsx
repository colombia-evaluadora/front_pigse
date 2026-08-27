import preview from "../../../../.storybook/preview"
import { AspectRatio } from "@/components/ui/aspect-ratio"

const meta = preview.meta({
  title: "Design System/Layout/AspectRatio",
  component: AspectRatio,
  tags: ["autodocs"],
})

export const Widescreen = meta.story({
  render: () => (
    <div className="w-80">
      <AspectRatio ratio={16 / 9} className="bg-muted">
        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
          16:9
        </div>
      </AspectRatio>
    </div>
  ),
})

export const Square = meta.story({
  render: () => (
    <div className="w-60">
      <AspectRatio ratio={1} className="bg-muted">
        <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
          1:1
        </div>
      </AspectRatio>
    </div>
  ),
})
