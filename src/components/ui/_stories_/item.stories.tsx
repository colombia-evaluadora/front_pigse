import preview from "../../../../.storybook/preview"
import { GearIcon } from "@/components/ui/icons"
import { Button } from "@/components/ui/button"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemSeparator,
  ItemTitle,
} from "@/components/ui/item"

const meta = preview.meta({
  title: "Design System/Layout/Item",
  component: Item,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <Item className="w-96">
      <ItemMedia variant="icon">
        <GearIcon />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Settings</ItemTitle>
        <ItemDescription>Manage your account preferences.</ItemDescription>
      </ItemContent>
      <ItemActions>
        <Button variant="ghost" size="icon-sm">
          →
        </Button>
      </ItemActions>
    </Item>
  ),
})

export const Outline = meta.story({
  args: { variant: "outline" },
  render: (args) => (
    <Item {...args} className="w-96">
      <ItemContent>
        <ItemTitle>Outline variant</ItemTitle>
        <ItemDescription>Uses a visible border.</ItemDescription>
      </ItemContent>
    </Item>
  ),
})

export const Small = meta.story({
  args: { size: "sm" },
  render: (args) => (
    <Item {...args} className="w-96">
      <ItemContent>
        <ItemTitle>Small size</ItemTitle>
      </ItemContent>
    </Item>
  ),
})

export const GroupWithSeparator = meta.story({
  render: () => (
    <ItemGroup className="w-96">
      <Item>
        <ItemContent>
          <ItemTitle>First item</ItemTitle>
        </ItemContent>
      </Item>
      <ItemSeparator />
      <Item>
        <ItemContent>
          <ItemTitle>Second item</ItemTitle>
        </ItemContent>
      </Item>
    </ItemGroup>
  ),
})
