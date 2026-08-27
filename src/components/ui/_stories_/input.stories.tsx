import preview from "../../../../.storybook/preview"
import { Input } from "@/components/ui/input"

const meta = preview.meta({
  title: "Design System/Forms/Input",
  component: Input,
  tags: ["autodocs"],
  args: { placeholder: "Email address" },
})

export const Default = meta.story({})
export const Disabled = meta.story({ args: { disabled: true } })
export const Invalid = meta.story({ args: { "aria-invalid": true } })
export const FileInput = meta.story({ args: { type: "file", placeholder: undefined } })
