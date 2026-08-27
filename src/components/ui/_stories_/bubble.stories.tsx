import preview from "../../../../.storybook/preview"
import { Bubble, BubbleContent, BubbleGroup, BubbleReactions } from "@/components/ui/bubble"

const meta = preview.meta({
  title: "Design System/Chat/Bubble",
  component: Bubble,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <Bubble>
      <BubbleContent>Hey, how's it going?</BubbleContent>
    </Bubble>
  ),
})

export const Secondary = meta.story({
  render: () => (
    <Bubble variant="secondary" align="end">
      <BubbleContent>Pretty good, thanks for asking!</BubbleContent>
    </Bubble>
  ),
})

export const Tinted = meta.story({
  render: () => (
    <Bubble variant="tinted">
      <BubbleContent>Tinted bubble style.</BubbleContent>
    </Bubble>
  ),
})

export const Ghost = meta.story({
  render: () => (
    <Bubble variant="ghost">
      <BubbleContent>No background, just text.</BubbleContent>
    </Bubble>
  ),
})

export const WithReactions = meta.story({
  render: () => (
    <Bubble>
      <BubbleContent>Great work on this feature!</BubbleContent>
      <BubbleReactions>👍 2</BubbleReactions>
    </Bubble>
  ),
})

export const Group = meta.story({
  render: () => (
    <BubbleGroup>
      <Bubble>
        <BubbleContent>First message</BubbleContent>
      </Bubble>
      <Bubble>
        <BubbleContent>Second message</BubbleContent>
      </Bubble>
    </BubbleGroup>
  ),
})
