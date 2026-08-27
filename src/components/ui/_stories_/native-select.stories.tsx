import preview from "../../../../.storybook/preview"
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "@/components/ui/native-select"

const meta = preview.meta({
  title: "Design System/Forms/NativeSelect",
  component: NativeSelect,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <NativeSelect defaultValue="apple" className="w-56">
      <NativeSelectOption value="apple">Apple</NativeSelectOption>
      <NativeSelectOption value="banana">Banana</NativeSelectOption>
      <NativeSelectOption value="blueberry">Blueberry</NativeSelectOption>
    </NativeSelect>
  ),
})

export const SmallSize = meta.story({
  render: () => (
    <NativeSelect size="sm" defaultValue="apple" className="w-56">
      <NativeSelectOption value="apple">Apple</NativeSelectOption>
      <NativeSelectOption value="banana">Banana</NativeSelectOption>
    </NativeSelect>
  ),
})

export const WithOptGroup = meta.story({
  render: () => (
    <NativeSelect defaultValue="apple" className="w-56">
      <NativeSelectOptGroup label="Fruits">
        <NativeSelectOption value="apple">Apple</NativeSelectOption>
        <NativeSelectOption value="banana">Banana</NativeSelectOption>
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label="Vegetables">
        <NativeSelectOption value="carrot">Carrot</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
  ),
})

export const Disabled = meta.story({
  render: () => (
    <NativeSelect disabled defaultValue="apple" className="w-56">
      <NativeSelectOption value="apple">Apple</NativeSelectOption>
    </NativeSelect>
  ),
})
