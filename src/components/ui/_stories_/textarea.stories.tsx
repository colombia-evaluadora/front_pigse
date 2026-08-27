import preview from "../../../../.storybook/preview"
import { Textarea } from "@/components/ui/textarea"

const meta = preview.meta({
  title: "Design System/Forms/Textarea",
  component: Textarea,
  tags: ["autodocs"],
  args: { placeholder: "Type your message here." },
})

export const Default = meta.story({})
export const Disabled = meta.story({ args: { disabled: true } })
export const Invalid = meta.story({ args: { "aria-invalid": true } })
