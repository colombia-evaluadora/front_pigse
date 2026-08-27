import preview from "../../../../.storybook/preview"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from "@/components/ui/button-group"

const meta = preview.meta({
  title: "Design System/Forms/ButtonGroup",
  component: ButtonGroup,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Left</Button>
      <Button variant="outline">Middle</Button>
      <Button variant="outline">Right</Button>
    </ButtonGroup>
  ),
})

export const Vertical = meta.story({
  render: () => (
    <ButtonGroup orientation="vertical">
      <Button variant="outline">Top</Button>
      <Button variant="outline">Middle</Button>
      <Button variant="outline">Bottom</Button>
    </ButtonGroup>
  ),
})

export const WithSeparatorAndText = meta.story({
  render: () => (
    <ButtonGroup>
      <Button variant="outline">Cut</Button>
      <Button variant="outline">Copy</Button>
      <ButtonGroupSeparator />
      <ButtonGroupText>v1.0</ButtonGroupText>
    </ButtonGroup>
  ),
})
