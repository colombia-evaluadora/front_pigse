import preview from "../../../../.storybook/preview"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const meta = preview.meta({
  title: "Design System/Forms/Label",
  component: Label,
  tags: ["autodocs"],
})

export const Default = meta.story({
  args: { children: "Email address" },
})

export const WithInput = meta.story({
  render: () => (
    <div className="flex w-72 flex-col gap-2">
      <Label htmlFor="email-label-story">Email address</Label>
      <Input id="email-label-story" placeholder="you@example.com" />
    </div>
  ),
})
