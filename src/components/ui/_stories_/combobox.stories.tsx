import preview from "../../../../.storybook/preview"
import { useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

const fruits = ["Apple", "Banana", "Blueberry", "Grapes", "Pineapple"]

const meta = preview.meta({
  title: "Design System/Forms/Combobox",
  component: Combobox,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => {
    const [value, setValue] = useState<string | null>(null)
    return (
      <Combobox items={fruits} value={value} onValueChange={(v) => setValue(v as string)}>
        <ComboboxInput placeholder="Search fruit…" />
        <ComboboxContent>
          <ComboboxEmpty>No fruit found.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    )
  },
})

export const WithClearButton = meta.story({
  render: () => {
    const [value, setValue] = useState<string | null>("Banana")
    return (
      <Combobox items={fruits} value={value} onValueChange={(v) => setValue(v as string)}>
        <ComboboxInput placeholder="Search fruit…" showClear />
        <ComboboxContent>
          <ComboboxEmpty>No fruit found.</ComboboxEmpty>
          <ComboboxList>
            {(item: string) => (
              <ComboboxItem key={item} value={item}>
                {item}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    )
  },
})
