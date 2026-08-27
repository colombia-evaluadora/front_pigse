import preview from "../../../../.storybook/preview"
import { FileTextIcon, XIcon } from "@/components/ui/icons"
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"

const meta = preview.meta({
  title: "Design System/Chat/Attachment",
  component: Attachment,
  tags: ["autodocs"],
})

export const Default = meta.story({
  render: () => (
    <Attachment className="w-72">
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>report.pdf</AttachmentTitle>
        <AttachmentDescription>240 KB</AttachmentDescription>
      </AttachmentContent>
      <AttachmentActions>
        <AttachmentAction>
          <XIcon />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ),
})

export const Uploading = meta.story({
  render: () => (
    <Attachment state="uploading" className="w-72">
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>report.pdf</AttachmentTitle>
        <AttachmentDescription>Uploading…</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  ),
})

export const ErrorState = meta.story({
  name: "Error",
  render: () => (
    <Attachment state="error" className="w-72">
      <AttachmentMedia>
        <FileTextIcon />
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle>report.pdf</AttachmentTitle>
        <AttachmentDescription>Upload failed</AttachmentDescription>
      </AttachmentContent>
    </Attachment>
  ),
})

export const Group = meta.story({
  render: () => (
    <AttachmentGroup>
      <Attachment orientation="vertical" size="sm">
        <AttachmentMedia>
          <FileTextIcon />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>file-one.pdf</AttachmentTitle>
        </AttachmentContent>
      </Attachment>
      <Attachment orientation="vertical" size="sm">
        <AttachmentMedia>
          <FileTextIcon />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle>file-two.pdf</AttachmentTitle>
        </AttachmentContent>
      </Attachment>
    </AttachmentGroup>
  ),
})
