import preview from "../../../../.storybook/preview"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/sonner"

const meta = preview.meta({
  title: "Design System/Feedback/Sonner",
  component: Toaster,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <>
      <Toaster />
      <Button
        variant="outline"
        onClick={() =>
          toast("Event has been created", {
            description: "Sunday, December 03, 2023 at 9:00 AM",
          })
        }
      >
        Show toast
      </Button>
    </>
  ),
})

export const Variants = meta.story({
  render: () => (
    <>
      <Toaster />
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => toast.success("Saved successfully")}>
          Success
        </Button>
        <Button variant="outline" onClick={() => toast.error("Something went wrong")}>
          Error
        </Button>
        <Button variant="outline" onClick={() => toast.warning("Check your input")}>
          Warning
        </Button>
      </div>
    </>
  ),
})
