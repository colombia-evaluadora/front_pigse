import preview from "../../../../.storybook/preview"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const meta = preview.meta({
  title: "Design System/Forms/RadioGroup",
  component: RadioGroup,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => {
    const [value, setValue] = useState("comfortable")
    return (
      <RadioGroup value={value} onValueChange={(v) => setValue(v as string)}>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="default" id="radio-default" />
          <Label htmlFor="radio-default">Default</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="comfortable" id="radio-comfortable" />
          <Label htmlFor="radio-comfortable">Comfortable</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="compact" id="radio-compact" />
          <Label htmlFor="radio-compact">Compact</Label>
        </div>
      </RadioGroup>
    )
  },
})

export const Disabled = meta.story({
  render: () => (
    <RadioGroup defaultValue="default" disabled>
      <div className="flex items-center gap-2 opacity-50">
        <RadioGroupItem value="default" id="radio-disabled-default" />
        <Label htmlFor="radio-disabled-default">Default</Label>
      </div>
      <div className="flex items-center gap-2 opacity-50">
        <RadioGroupItem value="comfortable" id="radio-disabled-comfortable" />
        <Label htmlFor="radio-disabled-comfortable">Comfortable</Label>
      </div>
    </RadioGroup>
  ),
})
