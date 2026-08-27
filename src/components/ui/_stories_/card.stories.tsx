import preview from "../../../../.storybook/preview"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const meta = preview.meta({
  title: "Design System/Layout/Card",
  component: Card,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Create project</CardTitle>
        <CardDescription>Deploy your new project in one click.</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon-sm">
            ⋮
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p>Card body content goes here.</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button>Deploy</Button>
      </CardFooter>
    </Card>
  ),
})

export const Small = meta.story({
  render: () => (
    <Card size="sm" className="w-80">
      <CardHeader>
        <CardTitle>Compact card</CardTitle>
        <CardDescription>Uses the sm size token.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Less padding than the default card.</p>
      </CardContent>
    </Card>
  ),
})
