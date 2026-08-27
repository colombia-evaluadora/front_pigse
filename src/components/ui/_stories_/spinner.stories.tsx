import preview from "../../../../.storybook/preview"
import { Spinner } from "@/components/ui/spinner"

const meta = preview.meta({
  title: "Design System/Feedback/Spinner",
  component: Spinner,
  tags: ["autodocs"],
})

export const Default = meta.story({})
export const Large = meta.story({ args: { className: "size-8" } })
