import preview from "../../../../.storybook/preview"
import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const meta = preview.meta({
  title: "Design System/Forms/Switch",
  component: Switch,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => {
    const [checked, setChecked] = useState(false)
    return (
      <div className="flex items-center gap-2">
        <Switch id="switch-default" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="switch-default">Airplane mode</Label>
      </div>
    )
  },
})

export const Small = meta.story({
  render: () => {
    const [checked, setChecked] = useState(true)
    return (
      <div className="flex items-center gap-2">
        <Switch id="switch-small" size="sm" checked={checked} onCheckedChange={setChecked} />
        <Label htmlFor="switch-small">Notifications</Label>
      </div>
    )
  },
})

export const Disabled = meta.story({
  render: () => (
    <div className="flex items-center gap-2 opacity-50">
      <Switch id="switch-disabled" disabled />
      <Label htmlFor="switch-disabled">Disabled</Label>
    </div>
  ),
})
