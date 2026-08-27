import preview from "../../../../.storybook/preview"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

const meta = preview.meta({
  title: "Design System/Feedback/Alert",
  component: Alert,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Heads up!</AlertTitle>
      <AlertDescription>You can add components to your app using the CLI.</AlertDescription>
    </Alert>
  ),
})

export const Destructive = meta.story({
  args: { variant: "destructive" },
  render: (args) => (
    <Alert {...args} className="w-96">
      <AlertTitle>Something went wrong</AlertTitle>
      <AlertDescription>Your session has expired. Please log in again.</AlertDescription>
    </Alert>
  ),
})
