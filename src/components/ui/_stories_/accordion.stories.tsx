import preview from "../../../../.storybook/preview"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/overlay/accordion"

const meta = preview.meta({
  title: "Design System/Layout/Accordion",
  component: Accordion,
  tags: ["autodocs"],
})

export const SingleOpen = meta.story({
  render: () => (
    <Accordion defaultValue={["item-1"]} className="w-96">
      <AccordionItem value="item-1">
        <AccordionTrigger>Is it accessible?</AccordionTrigger>
        <AccordionContent>Yes. It adheres to the WAI-ARIA design pattern.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Is it styled?</AccordionTrigger>
        <AccordionContent>
          Yes. It comes with default styles matching the design system.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
})

export const MultipleOpen = meta.story({
  render: () => (
    <Accordion multiple defaultValue={["item-1", "item-2"]} className="w-96">
      <AccordionItem value="item-1">
        <AccordionTrigger>First item</AccordionTrigger>
        <AccordionContent>Both items can be open at the same time.</AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Second item</AccordionTrigger>
        <AccordionContent>Because type is set to multiple.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
})
