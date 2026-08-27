import preview from "../../../../.storybook/preview"
import { MagnifyingGlassIcon } from "@/components/ui/icons"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group"

const meta = preview.meta({
  title: "Design System/Forms/InputGroup",
  component: InputGroup,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <InputGroup className="w-72">
      <InputGroupInput placeholder="Search…" />
      <InputGroupAddon>
        <MagnifyingGlassIcon />
      </InputGroupAddon>
    </InputGroup>
  ),
})

export const WithButtonAddon = meta.story({
  render: () => (
    <InputGroup className="w-72">
      <InputGroupInput placeholder="Search…" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton>Search</InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  ),
})

export const WithTextAddon = meta.story({
  render: () => (
    <InputGroup className="w-72">
      <InputGroupAddon>
        <InputGroupText>https://</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput placeholder="example.com" />
    </InputGroup>
  ),
})

export const WithTextarea = meta.story({
  render: () => (
    <InputGroup className="h-auto w-72">
      <InputGroupTextarea placeholder="Write a message…" />
    </InputGroup>
  ),
})
