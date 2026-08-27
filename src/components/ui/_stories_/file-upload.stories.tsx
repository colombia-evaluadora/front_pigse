import * as React from "react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"

import preview from "../../../../.storybook/preview"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  FileUpload,
  FileUploadClear,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
  type FileUploadProps,
  useFileUpload,
} from "@/components/ui/file-upload"
import { FolderOpenIcon, PaperclipIcon } from "@/components/ui/icons"

const meta = preview.meta({
  title: "Design System/Forms/FileUpload",
  component: FileUpload,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Componente compuesto para seleccionar, validar, previsualizar y cargar archivos. Su valor público es `File[]`, por lo que se integra directamente con TanStack Form.",
      },
    },
  },
})

export default meta

function createFile(name: string, type: string, content = "Contenido de ejemplo") {
  return new File([content], name, { type, lastModified: 1 })
}

function getFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function createImageFile() {
  return createFile(
    "comprobante.svg",
    "image/svg+xml",
    '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="#e7e5e4"/><circle cx="80" cy="64" r="28" fill="#78716c"/><path d="M32 138c8-28 28-42 48-42s40 14 48 42" fill="#78716c"/></svg>',
  )
}

function SelectedFiles() {
  const { fileStates } = useFileUpload()

  return (
    <FileUploadList>
      {fileStates.map(({ file }) => (
        <FileUploadItem key={getFileKey(file)} value={file}>
          <FileUploadItemPreview />
          <FileUploadItemMetadata />
          <FileUploadItemProgress />
          <FileUploadItemDelete />
        </FileUploadItem>
      ))}
    </FileUploadList>
  )
}

function UploadContent({ compact = false }: { compact?: boolean }) {
  return (
    <>
      <FileUploadDropzone className={compact ? "p-4" : undefined}>
        <FolderOpenIcon aria-hidden className="size-6 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Arrastra archivos aquí</p>
          <p className="text-xs text-muted-foreground">
            También puedes pegarlos o seleccionarlos desde tu equipo.
          </p>
        </div>
        <FileUploadTrigger render={<Button variant="outline" size="sm" />}>
          <PaperclipIcon data-icon="inline-start" />
          Seleccionar archivos
        </FileUploadTrigger>
      </FileUploadDropzone>
      <SelectedFiles />
      <FileUploadClear
        render={<Button variant="ghost" color="destructive" size="sm" />}
        className="self-end"
      >
        Eliminar todos
      </FileUploadClear>
    </>
  )
}

function FileUploadExample(props: FileUploadProps) {
  return (
    <FileUpload className="w-full max-w-xl" {...props}>
      <UploadContent />
    </FileUpload>
  )
}

export const Default = meta.story({
  render: () => <FileUploadExample />,
})

export const MultipleFiles = meta.story({
  render: () => (
    <FileUploadExample
      multiple
      maxFiles={5}
      defaultValue={[
        createFile("informe.pdf", "application/pdf"),
        createFile("resultados.xlsx", "application/vnd.ms-excel"),
        createFile("observaciones.txt", "text/plain"),
      ]}
    />
  ),
})

export const ImagePreview = meta.story({
  render: () => <FileUploadExample multiple accept="image/*" defaultValue={[createImageFile()]} />,
})

export const AcceptedFileTypes = meta.story({
  render: () => (
    <FieldGroup className="max-w-xl">
      <Field>
        <FieldLabel>Documentos de soporte</FieldLabel>
        <FileUploadExample accept=".pdf,.doc,.docx" multiple />
        <FieldDescription>Formatos permitidos: PDF, DOC y DOCX.</FieldDescription>
      </Field>
    </FieldGroup>
  ),
})

function ValidationExample() {
  const [error, setError] = React.useState("")

  return (
    <FieldGroup className="max-w-xl">
      <Field data-invalid={error ? "true" : undefined}>
        <FieldLabel>Evidencias</FieldLabel>
        <FileUpload
          multiple
          maxFiles={2}
          maxSize={1024}
          invalid={Boolean(error)}
          onAccept={() => setError("")}
          onFileReject={(_file, message) => setError(message)}
        >
          <UploadContent />
        </FileUpload>
        <FieldDescription>Máximo 2 archivos de 1 KB cada uno.</FieldDescription>
        {error && <FieldError>{error}</FieldError>}
      </Field>
    </FieldGroup>
  )
}

export const MaximumSizeAndCount = meta.story({
  render: () => <ValidationExample />,
})

async function simulateUpload(
  files: File[],
  options: Parameters<NonNullable<FileUploadProps["onUpload"]>>[1],
) {
  for (let progress = 20; progress <= 100; progress += 20) {
    await new Promise((resolve) => window.setTimeout(resolve, 180))
    for (const file of files) options.onProgress(file, progress)
  }

  for (const file of files) options.onSuccess(file)
}

export const UploadProgress = meta.story({
  render: () => <FileUploadExample multiple onUpload={simulateUpload} />,
})

export const ErrorState = meta.story({
  render: () => (
    <FileUploadExample
      onUpload={async (files, options) => {
        await new Promise((resolve) => window.setTimeout(resolve, 400))
        for (const file of files) {
          options.onError(file, new Error("No se pudo conectar con el servidor"))
        }
      }}
    />
  ),
})

export const Disabled = meta.story({
  render: () => <FileUploadExample disabled />,
})

export const RightToLeft = meta.story({
  render: () => (
    <FileUpload
      dir="rtl"
      className="w-full max-w-xl"
      multiple
      defaultValue={[createFile("documento.pdf", "application/pdf")]}
    >
      <UploadContent />
    </FileUpload>
  ),
})

function FieldIntegrationExample() {
  const [files, setFiles] = React.useState<File[]>([])
  const invalid = files.length === 0

  return (
    <FieldGroup className="max-w-xl">
      <Field data-invalid={invalid ? "true" : undefined}>
        <FieldLabel>Documentos obligatorios</FieldLabel>
        <FileUpload value={files} onValueChange={setFiles} multiple required invalid={invalid}>
          <UploadContent compact />
        </FileUpload>
        {invalid ? (
          <FieldError>Selecciona al menos un archivo.</FieldError>
        ) : (
          <FieldDescription>{files.length} archivo(s) seleccionado(s).</FieldDescription>
        )}
      </Field>
    </FieldGroup>
  )
}

export const IntegratedWithField = meta.story({
  render: () => <FieldIntegrationExample />,
})

const documentsSchema = z.object({
  documents: z
    .array(z.custom<File>((value) => value instanceof File))
    .min(1, "Selecciona al menos un documento"),
})

function TanStackFormExample() {
  const form = useForm({
    defaultValues: { documents: [] as File[] },
    validators: { onChange: documentsSchema },
    onSubmit: () => undefined,
  })

  return (
    <form
      className="w-full max-w-xl"
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="documents">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid ? "true" : undefined}>
                <FieldLabel htmlFor={field.name}>Anexos</FieldLabel>
                <FileUpload
                  name={field.name}
                  value={field.state.value}
                  onValueChange={(files) => {
                    field.handleChange(files)
                    field.handleBlur()
                  }}
                  multiple
                  invalid={isInvalid}
                >
                  <UploadContent compact />
                </FileUpload>
                <FieldDescription>
                  El valor del campo es un arreglo de objetos File.
                </FieldDescription>
                {isInvalid && <FieldError errors={field.state.meta.errors} />}
              </Field>
            )
          }}
        </form.Field>
        <Button type="submit" className="self-start">
          Enviar formulario
        </Button>
      </FieldGroup>
    </form>
  )
}

export const IntegratedWithTanStackForm = meta.story({
  render: () => <TanStackFormExample />,
})
