import preview from "../../../../.storybook/preview"
import { useState } from "react"
import { TimePickerPanel } from "@/components/ui/time-picker"

const meta = preview.meta({
  title: "Design System/Forms/TimePickerPanel",
  component: TimePickerPanel,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => {
    const [value, setValue] = useState<string | undefined>("09:30")
    return <TimePickerPanel value={value} onChange={setValue} className="rounded-md border" />
  },
})

export const Empty = meta.story({
  render: () => {
    const [value, setValue] = useState<string | undefined>(undefined)
    return <TimePickerPanel value={value} onChange={setValue} className="rounded-md border" />
  },
})

export const Afternoon = meta.story({
  render: () => {
    const [value, setValue] = useState<string | undefined>("15:45")
    return <TimePickerPanel value={value} onChange={setValue} className="rounded-md border" />
  },
})
