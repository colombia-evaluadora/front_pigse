import preview from "../../../../.storybook/preview"
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable"

const meta = preview.meta({
  title: "Design System/Layout/Resizable",
  component: ResizablePanelGroup,
  tags: ["autodocs"],
})

export const Horizontal = meta.story({
  render: () => (
    <ResizablePanelGroup orientation="horizontal" className="h-40 w-96 rounded-md border">
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center text-sm">One</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center text-sm">Two</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
})

export const Vertical = meta.story({
  render: () => (
    <ResizablePanelGroup orientation="vertical" className="h-56 w-64 rounded-md border">
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center text-sm">Top</div>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={50}>
        <div className="flex h-full items-center justify-center text-sm">Bottom</div>
      </ResizablePanel>
    </ResizablePanelGroup>
  ),
})
