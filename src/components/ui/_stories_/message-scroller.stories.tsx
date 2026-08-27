import preview from "../../../../.storybook/preview"
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/components/ui/message-scroller"
import { Message, MessageContent } from "@/components/ui/message"

const meta = preview.meta({
  title: "Design System/Chat/MessageScroller",
  component: MessageScroller,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <MessageScrollerProvider>
      <MessageScroller className="h-72 w-96 border">
        <MessageScrollerViewport>
          <MessageScrollerContent>
            {Array.from({ length: 8 }, (_, i) => (
              <MessageScrollerItem key={i}>
                <Message align={i % 2 === 0 ? "start" : "end"}>
                  <MessageContent>Message number {i + 1}</MessageContent>
                </Message>
              </MessageScrollerItem>
            ))}
          </MessageScrollerContent>
        </MessageScrollerViewport>
        <MessageScrollerButton />
      </MessageScroller>
    </MessageScrollerProvider>
  ),
})
