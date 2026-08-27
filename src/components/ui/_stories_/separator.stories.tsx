import preview from "../../../../.storybook/preview"
import { Separator } from "@/components/ui/separator"

const meta = preview.meta({
  title: "Design System/Layout/Separator",
  component: Separator,
  tags: ["autodocs"],
})

export const Horizontal = meta.story({
  render: () => (
    <div className="w-64">
      <div className="text-sm">Section above</div>
      <Separator className="my-4" />
      <div className="text-sm">Section below</div>
    </div>
  ),
})

export const Vertical = meta.story({
  render: () => (
    <div className="flex h-8 items-center gap-4 text-sm">
      <span>Blog</span>
      <Separator orientation="vertical" />
      <span>Docs</span>
      <Separator orientation="vertical" />
      <span>Source</span>
    </div>
  ),
})
