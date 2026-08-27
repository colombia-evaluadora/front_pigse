import preview from "../../../../.storybook/preview"
import { Message, MessageAvatar, MessageContent } from "@/components/ui/message"

const meta = preview.meta({
  title: "Design System/Chat/Message",
  component: Message,
  tags: ["autodocs"],
})

export const IncomingStart = meta.story({
  render: () => (
    <Message align="start" className="max-w-md">
      <MessageAvatar>AI</MessageAvatar>
      <MessageContent>Hi! How can I help you today?</MessageContent>
    </Message>
  ),
})

export const OutgoingEnd = meta.story({
  render: () => (
    <Message align="end" className="max-w-md">
      <MessageContent>I need help setting up Storybook.</MessageContent>
    </Message>
  ),
})
