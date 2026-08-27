import preview from "../../../../.storybook/preview"
import { Skeleton } from "@/components/ui/skeleton"

const meta = preview.meta({
  title: "Design System/Feedback/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
})

export const Default = meta.story({
  args: { className: "h-4 w-48" },
})

export const CardPlaceholder = meta.story({
  render: () => (
    <div className="flex items-center gap-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  ),
})
