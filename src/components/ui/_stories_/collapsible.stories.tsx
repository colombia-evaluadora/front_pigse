import preview from "../../../../.storybook/preview"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

const meta = preview.meta({
  title: "Design System/Layout/Collapsible",
  component: Collapsible,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => {
    const [open, setOpen] = useState(false)
    return (
      <Collapsible open={open} onOpenChange={setOpen} className="w-72">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">@peduarte starred 3 repositories</span>
          <CollapsibleTrigger render={<Button variant="ghost" size="icon-sm" />}>
            {open ? "−" : "+"}
          </CollapsibleTrigger>
        </div>
        <div className="rounded-none border px-4 py-2 text-sm">@radix-ui/primitives</div>
        <CollapsibleContent className="flex flex-col gap-2">
          <div className="rounded-none border px-4 py-2 text-sm">@radix-ui/colors</div>
          <div className="rounded-none border px-4 py-2 text-sm">@stitches/react</div>
        </CollapsibleContent>
      </Collapsible>
    )
  },
})
