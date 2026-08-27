import preview from "../../../../.storybook/preview"
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress"

const meta = preview.meta({
  title: "Design System/Feedback/Progress",
  component: Progress,
  tags: ["autodocs"],
})

export const Default = meta.story({
  args: { value: 40 },
  render: (args) => <Progress {...args} className="w-64" />,
})

export const WithLabel = meta.story({
  render: () => (
    <Progress value={65} className="w-64">
      <ProgressLabel>Uploading</ProgressLabel>
      <ProgressValue />
    </Progress>
  ),
})

export const Indeterminate = meta.story({
  render: () => <Progress value={null} className="w-64" />,
})
