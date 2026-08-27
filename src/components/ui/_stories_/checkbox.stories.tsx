import preview from "../../../../.storybook/preview"
import { useState } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

const meta = preview.meta({
  title: "Design System/Forms/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id="checkbox-default"
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
        />
        <Label htmlFor="checkbox-default">Accept terms and conditions</Label>
      </div>
    )
  },
})

export const CheckedByDefault = meta.story({
  render: () => {
    const [checked, setChecked] = useState(true)
    return (
      <div className="flex items-center gap-2">
        <Checkbox
          id="checkbox-checked"
          checked={checked}
          onCheckedChange={(v) => setChecked(v === true)}
        />
        <Label htmlFor="checkbox-checked">Subscribe to newsletter</Label>
      </div>
    )
  },
})

export const Disabled = meta.story({
  render: () => (
    <div className="flex items-center gap-2 opacity-50">
      <Checkbox id="checkbox-disabled" disabled />
      <Label htmlFor="checkbox-disabled">Disabled option</Label>
    </div>
  ),
})

export const Invalid = meta.story({
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="checkbox-invalid" aria-invalid />
      <Label htmlFor="checkbox-invalid">Required option</Label>
    </div>
  ),
})
