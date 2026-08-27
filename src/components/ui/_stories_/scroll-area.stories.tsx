import preview from "../../../../.storybook/preview"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

const tags = Array.from({ length: 30 }, (_, i) => `Tag ${i + 1}`)

const meta = preview.meta({
  title: "Design System/Layout/ScrollArea",
  component: ScrollArea,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <ScrollArea className="h-72 w-56 rounded-md border">
      <div className="p-4">
        <h4 className="mb-4 text-sm font-medium">Tags</h4>
        {tags.map((tag) => (
          <div key={tag}>
            <div className="text-sm">{tag}</div>
            <Separator className="my-2" />
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
})

export const HorizontalScroll = meta.story({
  render: () => (
    <ScrollArea className="w-96 rounded-md border whitespace-nowrap">
      <div className="flex gap-4 p-4">
        {tags.slice(0, 10).map((tag) => (
          <div key={tag} className="w-24 shrink-0 bg-muted p-4 text-center text-sm">
            {tag}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
})
