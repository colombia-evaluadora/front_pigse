import preview from "../../../../.storybook/preview"
import { useState } from "react"
import { Slider } from "@/components/ui/slider"

const meta = preview.meta({
  title: "Design System/Forms/Slider",
  component: Slider,
  tags: ["autodocs"],
})

const toArray = (value: number | readonly number[]) =>
  Array.isArray(value) ? [...value] : [value as number]

export const Default = meta.story({
  render: () => {
    const [value, setValue] = useState([50])
    return (
      <Slider className="w-56" value={value} onValueChange={(next) => setValue(toArray(next))} />
    )
  },
})

export const Range = meta.story({
  render: () => {
    const [value, setValue] = useState([25, 75])
    return (
      <Slider className="w-56" value={value} onValueChange={(next) => setValue(toArray(next))} />
    )
  },
})

export const Vertical = meta.story({
  render: () => {
    const [value, setValue] = useState([40])
    return (
      <Slider
        orientation="vertical"
        className="h-40"
        value={value}
        onValueChange={(next) => setValue(toArray(next))}
      />
    )
  },
})

export const Disabled = meta.story({
  args: { defaultValue: [50], disabled: true },
})
