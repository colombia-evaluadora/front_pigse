import preview from "../../../../.storybook/preview"
import { Button } from "@/components/ui/button"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/overlay/hover-card"

const meta = preview.meta({
  title: "Design System/Overlays/HoverCard",
  component: HoverCard,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <HoverCard>
      <HoverCardTrigger render={<Button variant="link" />}>@storybook</HoverCardTrigger>
      <HoverCardContent>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold">@storybook</p>
          <p className="text-sm text-muted-foreground">
            The industry standard workshop for building, documenting, and testing UI components.
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  ),
})
