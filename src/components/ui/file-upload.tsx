"use client"

import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment"
import { useDirection } from "@/components/ui/direction"
import {
  FilePdfIcon,
  FileTextIcon,
  FileXlsIcon,
  PaperclipIcon,
  TrashIcon,
  VideoIcon,
} from "@/components/ui/icons"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

const ROOT_NAME = "FileUpload"
const DROPZONE_NAME = "FileUploadDropzone"
const TRIGGER_NAME = "FileUploadTrigger"
const LIST_NAME = "FileUploadList"
const ITEM_NAME = "FileUploadItem"
const ITEM_PREVIEW_NAME = "FileUploadItemPreview"
const ITEM_METADATA_NAME = "FileUploadItemMetadata"
const ITEM_PROGRESS_NAME = "FileUploadItemProgress"
const ITEM_DELETE_NAME = "FileUploadItemDelete"
const CLEAR_NAME = "FileUploadClear"

type Direction = "ltr" | "rtl"
type FileUploadStatus = "idle" | "uploading" | "error" | "success"

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B"

  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), sizes.length - 1)

  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${sizes[index]}`
}

function createFileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function isFileAccepted(file: File, accept?: string) {
  if (!accept) return true

  const fileType = file.type.toLowerCase()
  const fileExtension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`
  const acceptedTypes = accept
    .split(",")
    .map((type) => type.trim().toLowerCase())
    .filter(Boolean)

  return acceptedTypes.some((type) => {
    if (type.startsWith(".")) return type === fileExtension
    if (type.endsWith("/*")) return fileType.startsWith(type.slice(0, -1))
    return type === fileType
  })
}

interface FileUploadFileState {
  file: File
  progress: number
  error?: string
  status: FileUploadStatus
}

interface FileUploadContextValue {
  inputId: string
  dropzoneId: string
  listId: string
  labelId: string
  disabled: boolean
  invalid: boolean
  dir: Direction
  fileStates: FileUploadFileState[]
  inputRef: React.RefObject<HTMLInputElement | null>
  urlCache: Map<File, string>
  addFiles: (files: File[]) => void
  removeFile: (file: File) => void
  clearFiles: () => void
  openFileDialog: () => void
}

const FileUploadContext = React.createContext<FileUploadContextValue | null>(null)

function useFileUploadContext(consumerName: string) {
  const context = React.useContext(FileUploadContext)

  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ROOT_NAME}\``)
  }

  return context
}

interface FileUploadProps extends Omit<
  React.ComponentProps<"div"> & useRender.ComponentProps<"div">,
  "defaultValue" | "onChange"
> {
  value?: File[]
  defaultValue?: File[]
  onValueChange?: (files: File[]) => void
  onAccept?: (files: File[]) => void
  onFileAccept?: (file: File) => void
  onFileReject?: (file: File, message: string) => void
  onFileValidate?: (file: File) => string | null | undefined
  onUpload?: (
    files: File[],
    options: {
      onProgress: (file: File, progress: number) => void
      onSuccess: (file: File) => void
      onError: (file: File, error: Error) => void
    },
  ) => Promise<void> | void
  accept?: string
  maxFiles?: number
  maxSize?: number
  dir?: Direction
  label?: string
  name?: string
  disabled?: boolean
  invalid?: boolean
  multiple?: boolean
  required?: boolean
}

function createInitialFileStates(files: File[] | undefined) {
  return (files ?? []).map<FileUploadFileState>((file) => ({
    file,
    progress: 0,
    status: "idle",
  }))
}

function FileUpload(props: FileUploadProps) {
  const {
    value,
    defaultValue,
    onValueChange,
    onAccept,
    onFileAccept,
    onFileReject,
    onFileValidate,
    onUpload,
    accept,
    maxFiles,
    maxSize,
    dir: dirProp,
    label,
    name,
    render,
    disabled = false,
    invalid = false,
    multiple = false,
    required = false,
    children,
    className,
    ...rootProps
  } = props

  const inputId = React.useId()
  const dropzoneId = React.useId()
  const listId = React.useId()
  const labelId = React.useId()
  const contextDirection = useDirection()
  const dir = dirProp ?? contextDirection
  const inputRef = React.useRef<HTMLInputElement>(null)
  const urlCacheRef = React.useRef(new Map<File, string>())
  const invalidTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const [internalInvalid, setInternalInvalid] = React.useState(false)
  const [fileStates, setFileStates] = React.useState<FileUploadFileState[]>(() =>
    createInitialFileStates(value ?? defaultValue),
  )

  const isInvalid = invalid || internalInvalid

  React.useEffect(() => {
    if (value === undefined) return

    setFileStates((currentStates) => {
      const statesByKey = new Map(
        currentStates.map((fileState) => [createFileKey(fileState.file), fileState]),
      )

      return value.map((file) => {
        const currentState = statesByKey.get(createFileKey(file))
        return currentState
          ? { ...currentState, file }
          : {
              file,
              progress: 0,
              status: "idle" as const,
            }
      })
    })
  }, [value])

  React.useEffect(() => {
    const urlCache = urlCacheRef.current

    return () => {
      if (invalidTimerRef.current) clearTimeout(invalidTimerRef.current)
      for (const url of urlCache.values()) URL.revokeObjectURL(url)
      urlCache.clear()
    }
  }, [])

  const flashInvalid = React.useCallback(() => {
    setInternalInvalid(true)
    if (invalidTimerRef.current) clearTimeout(invalidTimerRef.current)
    invalidTimerRef.current = setTimeout(() => setInternalInvalid(false), 2000)
  }, [])

  const revokeFileUrl = React.useCallback((file: File) => {
    const cachedUrl = urlCacheRef.current.get(file)
    if (!cachedUrl) return

    URL.revokeObjectURL(cachedUrl)
    urlCacheRef.current.delete(file)
  }, [])

  const updateFileState = React.useCallback(
    (file: File, update: (fileState: FileUploadFileState) => FileUploadFileState) => {
      const key = createFileKey(file)
      setFileStates((currentStates) =>
        currentStates.map((fileState) =>
          createFileKey(fileState.file) === key ? update(fileState) : fileState,
        ),
      )
    },
    [],
  )

  const uploadFiles = React.useCallback(
    async (files: File[]) => {
      if (!onUpload) return

      for (const file of files) {
        updateFileState(file, (fileState) => ({
          ...fileState,
          progress: 0,
          status: "uploading",
          error: undefined,
        }))
      }

      try {
        await onUpload(files, {
          onProgress: (file, progress) => {
            updateFileState(file, (fileState) => ({
              ...fileState,
              progress: Math.min(Math.max(progress, 0), 100),
              status: "uploading",
            }))
          },
          onSuccess: (file) => {
            updateFileState(file, (fileState) => ({
              ...fileState,
              progress: 100,
              status: "success",
              error: undefined,
            }))
          },
          onError: (file, error) => {
            updateFileState(file, (fileState) => ({
              ...fileState,
              status: "error",
              error: error.message || "No se pudo cargar el archivo",
            }))
          },
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : "No se pudo cargar el archivo"

        for (const file of files) {
          updateFileState(file, (fileState) => ({
            ...fileState,
            status: "error",
            error: message,
          }))
        }
      }
    },
    [onUpload, updateFileState],
  )

  const addFiles = React.useCallback(
    (incomingFiles: File[]) => {
      if (disabled || incomingFiles.length === 0) return

      const baseStates = multiple ? fileStates : []
      const knownKeys = new Set(baseStates.map((fileState) => createFileKey(fileState.file)))
      const acceptedFiles: File[] = []
      const maximum = multiple ? maxFiles : 1
      let rejectedAny = false

      for (const file of incomingFiles) {
        const key = createFileKey(file)
        if (knownKeys.has(key)) continue

        let rejectionMessage = onFileValidate?.(file) ?? ""

        if (!rejectionMessage && !isFileAccepted(file, accept)) {
          rejectionMessage = "Tipo de archivo no permitido"
        }

        if (!rejectionMessage && maxSize && file.size > maxSize) {
          rejectionMessage = "El archivo supera el tamaño máximo permitido"
        }

        if (!rejectionMessage && maximum && baseStates.length + acceptedFiles.length >= maximum) {
          rejectionMessage = `Solo puedes seleccionar hasta ${maximum} ${maximum === 1 ? "archivo" : "archivos"}`
        }

        if (rejectionMessage) {
          rejectedAny = true
          onFileReject?.(file, rejectionMessage)
          continue
        }

        knownKeys.add(key)
        acceptedFiles.push(file)
      }

      if (rejectedAny) flashInvalid()
      if (acceptedFiles.length === 0) return

      const nextStates = [
        ...baseStates,
        ...acceptedFiles.map<FileUploadFileState>((file) => ({
          file,
          progress: 0,
          status: "idle",
        })),
      ]

      setFileStates(nextStates)
      onValueChange?.(nextStates.map((fileState) => fileState.file))
      onAccept?.(acceptedFiles)
      for (const file of acceptedFiles) onFileAccept?.(file)

      if (onUpload) {
        requestAnimationFrame(() => void uploadFiles(acceptedFiles))
      }
    },
    [
      accept,
      disabled,
      fileStates,
      flashInvalid,
      maxFiles,
      maxSize,
      multiple,
      onAccept,
      onFileAccept,
      onFileReject,
      onFileValidate,
      onUpload,
      onValueChange,
      uploadFiles,
    ],
  )

  const removeFile = React.useCallback(
    (file: File) => {
      const key = createFileKey(file)
      revokeFileUrl(file)

      const nextStates = fileStates.filter((fileState) => createFileKey(fileState.file) !== key)
      setFileStates(nextStates)
      onValueChange?.(nextStates.map((fileState) => fileState.file))
    },
    [fileStates, onValueChange, revokeFileUrl],
  )

  const clearFiles = React.useCallback(() => {
    for (const url of urlCacheRef.current.values()) URL.revokeObjectURL(url)
    urlCacheRef.current.clear()

    setFileStates([])
    setInternalInvalid(false)
    onValueChange?.([])
  }, [onValueChange])

  const openFileDialog = React.useCallback(() => {
    if (!disabled) inputRef.current?.click()
  }, [disabled])

  const onInputChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      addFiles(Array.from(event.target.files ?? []))
      event.target.value = ""
    },
    [addFiles],
  )

  const contextValue = React.useMemo<FileUploadContextValue>(
    () => ({
      inputId,
      dropzoneId,
      listId,
      labelId,
      disabled,
      invalid: isInvalid,
      dir,
      fileStates,
      inputRef,
      urlCache: urlCacheRef.current,
      addFiles,
      removeFile,
      clearFiles,
      openFileDialog,
    }),
    [
      addFiles,
      clearFiles,
      dir,
      disabled,
      dropzoneId,
      fileStates,
      inputId,
      isInvalid,
      labelId,
      listId,
      openFileDialog,
      removeFile,
    ],
  )

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        dir,
        className: cn("relative flex flex-col gap-3", className),
        children: (
          <>
            {children}
            <input
              id={inputId}
              ref={inputRef}
              type="file"
              tabIndex={-1}
              accept={accept}
              name={name}
              className="sr-only"
              disabled={disabled}
              multiple={multiple}
              required={required && fileStates.length === 0}
              aria-labelledby={labelId}
              aria-describedby={dropzoneId}
              aria-invalid={isInvalid}
              onChange={onInputChange}
            />
            <span id={labelId} className="sr-only">
              {label ?? "Carga de archivos"}
            </span>
          </>
        ),
      },
      rootProps,
    ),
    render,
    state: {
      slot: "file-upload",
      disabled: disabled ? "" : undefined,
      invalid: isInvalid ? "" : undefined,
    },
  })

  return <FileUploadContext.Provider value={contextValue}>{element}</FileUploadContext.Provider>
}

interface FileUploadDropzoneProps
  extends React.ComponentProps<"div">, useRender.ComponentProps<"div"> {}

function FileUploadDropzone(props: FileUploadDropzoneProps) {
  const {
    render,
    className,
    onClick: onClickProp,
    onDragOver: onDragOverProp,
    onDragEnter: onDragEnterProp,
    onDragLeave: onDragLeaveProp,
    onDrop: onDropProp,
    onPaste: onPasteProp,
    onKeyDown: onKeyDownProp,
    ...dropzoneProps
  } = props
  const context = useFileUploadContext(DROPZONE_NAME)
  const [dragging, setDragging] = React.useState(false)

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      onClickProp?.(event)
      if (event.defaultPrevented || context.disabled) return

      const target = event.target
      const isFromTrigger =
        target instanceof HTMLElement && target.closest('[data-slot="file-upload-trigger"]')

      if (!isFromTrigger) context.openFileDialog()
    },
    [context, onClickProp],
  )

  const onDragOver = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragOverProp?.(event)
      if (event.defaultPrevented || context.disabled) return
      event.preventDefault()
      event.dataTransfer.dropEffect = "copy"
      setDragging(true)
    },
    [context.disabled, onDragOverProp],
  )

  const onDragEnter = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragEnterProp?.(event)
      if (event.defaultPrevented || context.disabled) return
      event.preventDefault()
      setDragging(true)
    },
    [context.disabled, onDragEnterProp],
  )

  const onDragLeave = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDragLeaveProp?.(event)
      if (event.defaultPrevented) return

      const relatedTarget = event.relatedTarget
      if (relatedTarget instanceof Node && event.currentTarget.contains(relatedTarget)) {
        return
      }

      setDragging(false)
    },
    [onDragLeaveProp],
  )

  const onDrop = React.useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      onDropProp?.(event)
      if (event.defaultPrevented || context.disabled) return
      event.preventDefault()
      setDragging(false)
      context.addFiles(Array.from(event.dataTransfer.files))
    },
    [context, onDropProp],
  )

  const onPaste = React.useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      onPasteProp?.(event)
      if (event.defaultPrevented || context.disabled) return

      const files = Array.from(event.clipboardData.items)
        .filter((item) => item.kind === "file")
        .map((item) => item.getAsFile())
        .filter((file): file is File => file !== null)

      if (files.length === 0) return
      event.preventDefault()
      context.addFiles(files)
    },
    [context, onPasteProp],
  )

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDownProp?.(event)
      if (
        event.defaultPrevented ||
        context.disabled ||
        (event.key !== "Enter" && event.key !== " ")
      ) {
        return
      }

      event.preventDefault()
      context.openFileDialog()
    },
    [context, onKeyDownProp],
  )

  return useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        id: context.dropzoneId,
        role: "region",
        tabIndex: context.disabled ? undefined : 0,
        dir: context.dir,
        "aria-labelledby": context.labelId,
        "aria-controls": `${context.inputId} ${context.listId}`,
        "aria-disabled": context.disabled,
        "aria-invalid": context.invalid,
        className: cn(
          "relative flex select-none flex-col items-center justify-center gap-3 border-2 border-dashed border-border p-6 text-center outline-none transition-colors hover:bg-muted/30 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20 data-disabled:pointer-events-none data-disabled:opacity-50 data-dragging:border-primary data-dragging:bg-primary/5 data-invalid:border-red data-invalid:ring-2 data-invalid:ring-red/20",
          className,
        ),
        onClick,
        onDragEnter,
        onDragLeave,
        onDragOver,
        onDrop,
        onKeyDown,
        onPaste,
      },
      dropzoneProps,
    ),
    render,
    state: {
      slot: "file-upload-dropzone",
      disabled: context.disabled ? "" : undefined,
      dragging: dragging ? "" : undefined,
      invalid: context.invalid ? "" : undefined,
    },
  })
}

interface FileUploadTriggerProps
  extends React.ComponentProps<"button">, useRender.ComponentProps<"button"> {}

function FileUploadTrigger(props: FileUploadTriggerProps) {
  const { render, onClick: onClickProp, ...triggerProps } = props
  const context = useFileUploadContext(TRIGGER_NAME)

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClickProp?.(event)
      if (!event.defaultPrevented) context.openFileDialog()
    },
    [context, onClickProp],
  )

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        "aria-controls": context.inputId,
        disabled: context.disabled,
        onClick,
      },
      triggerProps,
    ),
    render,
    state: {
      slot: "file-upload-trigger",
      disabled: context.disabled ? "" : undefined,
    },
  })
}

interface FileUploadListProps extends React.ComponentProps<"div">, useRender.ComponentProps<"div"> {
  orientation?: "horizontal" | "vertical"
  forceMount?: boolean
}

function FileUploadList(props: FileUploadListProps) {
  const { className, orientation = "vertical", render, forceMount = false, ...listProps } = props
  const context = useFileUploadContext(LIST_NAME)
  const shouldRender = forceMount || context.fileStates.length > 0

  const element = useRender({
    defaultTagName: "div",
    props: mergeProps<"div">(
      {
        id: context.listId,
        role: "list",
        dir: context.dir,
        className: cn(
          "flex flex-col gap-2",
          orientation === "horizontal" && "flex-row overflow-x-auto overscroll-x-contain py-1",
          className,
        ),
      },
      listProps,
    ),
    render,
    state: {
      slot: "file-upload-list",
      orientation,
    },
  })

  if (!shouldRender) return null

  return element
}

interface FileUploadItemContextValue {
  id: string
  fileState: FileUploadFileState
  nameId: string
  sizeId: string
  statusId: string
  messageId: string
}

const FileUploadItemContext = React.createContext<FileUploadItemContextValue | null>(null)

function useFileUploadItemContext(consumerName: string) {
  const context = React.useContext(FileUploadItemContext)
  if (!context) {
    throw new Error(`\`${consumerName}\` must be used within \`${ITEM_NAME}\``)
  }
  return context
}

interface FileUploadItemProps extends React.ComponentProps<typeof Attachment> {
  value: File
}

function FileUploadItem(props: FileUploadItemProps) {
  const { value, children, className, ...itemProps } = props
  const context = useFileUploadContext(ITEM_NAME)
  const id = React.useId()
  const nameId = `${id}-name`
  const sizeId = `${id}-size`
  const statusId = `${id}-status`
  const messageId = `${id}-message`
  const key = createFileKey(value)
  const fileIndex = context.fileStates.findIndex((state) => createFileKey(state.file) === key)
  const fileState = context.fileStates[fileIndex]

  if (!fileState) return null

  const state =
    fileState.status === "idle" || fileState.status === "success" ? "done" : fileState.status
  const statusText = fileState.error
    ? `Error: ${fileState.error}`
    : fileState.status === "uploading"
      ? `Cargando: ${fileState.progress}% completado`
      : fileState.status === "success"
        ? "Carga completada"
        : "Listo para enviar"
  const itemContext = {
    id,
    fileState,
    nameId,
    sizeId,
    statusId,
    messageId,
  }

  return (
    <FileUploadItemContext.Provider value={itemContext}>
      <Attachment
        id={id}
        role="listitem"
        data-slot="file-upload-item"
        state={state}
        aria-setsize={context.fileStates.length}
        aria-posinset={fileIndex + 1}
        aria-labelledby={nameId}
        aria-describedby={`${sizeId} ${statusId}${fileState.error ? ` ${messageId}` : ""}`}
        className={cn("w-full", className)}
        {...itemProps}
      >
        {children}
        <span id={statusId} className="sr-only">
          {statusText}
        </span>
      </Attachment>
    </FileUploadItemContext.Provider>
  )
}

interface FileUploadItemPreviewProps extends Omit<
  React.ComponentProps<typeof AttachmentMedia>,
  "children"
> {
  children?: React.ReactNode
  previewRender?: (file: File, fallback: () => React.ReactNode) => React.ReactNode
}

function getFileIcon(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? ""

  if (file.type.startsWith("video/")) return <VideoIcon />
  if (extension === "pdf") return <FilePdfIcon />
  if (["xls", "xlsx", "csv"].includes(extension)) return <FileXlsIcon />
  if (
    file.type.startsWith("text/") ||
    ["txt", "md", "rtf", "doc", "docx", "json", "xml"].includes(extension)
  ) {
    return <FileTextIcon />
  }

  return <PaperclipIcon />
}

function FileUploadItemPreview(props: FileUploadItemPreviewProps) {
  const { previewRender, children, className, ...previewProps } = props
  const itemContext = useFileUploadItemContext(ITEM_PREVIEW_NAME)
  const context = useFileUploadContext(ITEM_PREVIEW_NAME)
  const file = itemContext.fileState.file
  const isImage = file.type.startsWith("image/")

  const getDefaultPreview = React.useCallback(() => {
    if (!isImage) return getFileIcon(file)

    let url = context.urlCache.get(file)
    if (!url) {
      url = URL.createObjectURL(file)
      context.urlCache.set(file, url)
    }

    return <img src={url} alt="" className="size-full object-cover" />
  }, [context.urlCache, file, isImage])

  const content = previewRender ? previewRender(file, getDefaultPreview) : getDefaultPreview()

  return (
    <AttachmentMedia
      data-slot="file-upload-item-preview"
      variant={isImage ? "image" : "icon"}
      className={cn(className)}
      {...previewProps}
    >
      {content}
      {children}
    </AttachmentMedia>
  )
}

interface FileUploadItemMetadataProps extends React.ComponentProps<typeof AttachmentContent> {
  size?: "default" | "sm"
}

function FileUploadItemMetadata(props: FileUploadItemMetadataProps) {
  const { size = "default", children, className, ...metadataProps } = props
  const itemContext = useFileUploadItemContext(ITEM_METADATA_NAME)
  const { file, progress, status, error } = itemContext.fileState
  const description = error
    ? error
    : status === "uploading"
      ? `${formatBytes(file.size)} · ${progress}%`
      : formatBytes(file.size)

  return (
    <AttachmentContent
      data-slot="file-upload-item-metadata"
      className={cn(className)}
      {...metadataProps}
    >
      {children ?? (
        <>
          <AttachmentTitle
            id={itemContext.nameId}
            className={cn(size === "sm" && "text-xs font-normal")}
          >
            {file.name}
          </AttachmentTitle>
          <AttachmentDescription
            id={error ? itemContext.messageId : itemContext.sizeId}
            className={cn(size === "sm" && "text-[11px]")}
          >
            {description}
          </AttachmentDescription>
          {error && (
            <span id={itemContext.sizeId} className="sr-only">
              {formatBytes(file.size)}
            </span>
          )}
        </>
      )}
    </AttachmentContent>
  )
}

interface FileUploadItemProgressProps extends React.ComponentProps<"div"> {
  variant?: "linear" | "circular" | "fill"
  size?: number
  forceMount?: boolean
}

function FileUploadItemProgress(props: FileUploadItemProgressProps) {
  const { variant = "linear", size = 40, forceMount = false, className, ...progressProps } = props
  const itemContext = useFileUploadItemContext(ITEM_PROGRESS_NAME)
  const progress = itemContext.fileState.progress
  const shouldRender = forceMount || itemContext.fileState.status === "uploading"

  if (!shouldRender) return null

  if (variant === "linear") {
    return (
      <Progress
        value={progress}
        data-slot="file-upload-item-progress"
        aria-labelledby={itemContext.nameId}
        className={cn("basis-full gap-0 px-3 pb-2", className)}
        {...progressProps}
      />
    )
  }

  if (variant === "fill") {
    return (
      <div
        role="progressbar"
        data-slot="file-upload-item-progress"
        data-variant="fill"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progress}
        aria-valuetext={`${progress}%`}
        aria-labelledby={itemContext.nameId}
        className={cn(
          "pointer-events-none absolute inset-0 bg-primary/10 transition-[clip-path] duration-300 ease-linear",
          className,
        )}
        style={{ clipPath: `inset(${100 - progress}% 0 0 0)` }}
        {...progressProps}
      />
    )
  }

  const radius = (size - 4) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <div
      role="progressbar"
      data-slot="file-upload-item-progress"
      data-variant="circular"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      aria-valuetext={`${progress}%`}
      aria-labelledby={itemContext.nameId}
      className={cn("absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2", className)}
      {...progressProps}
    >
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        fill="none"
        stroke="currentColor"
        aria-hidden="true"
      >
        <circle
          className="text-primary/20"
          strokeWidth="2"
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
        <circle
          className="text-primary transition-[stroke-dashoffset] duration-300 ease-linear"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          cx={size / 2}
          cy={size / 2}
          r={radius}
        />
      </svg>
    </div>
  )
}

interface FileUploadItemDeleteProps extends React.ComponentProps<typeof AttachmentAction> {}

function FileUploadItemDelete(props: FileUploadItemDeleteProps) {
  const { onClick: onClickProp, disabled, children, ...deleteProps } = props
  const context = useFileUploadContext(ITEM_DELETE_NAME)
  const itemContext = useFileUploadItemContext(ITEM_DELETE_NAME)

  const onClick = React.useCallback<NonNullable<FileUploadItemDeleteProps["onClick"]>>(
    (event) => {
      onClickProp?.(event)
      if (!event.defaultPrevented) {
        context.removeFile(itemContext.fileState.file)
      }
    },
    [context, itemContext.fileState.file, onClickProp],
  )

  return (
    <AttachmentActions data-slot="file-upload-item-actions">
      <AttachmentAction
        data-slot="file-upload-item-delete"
        type="button"
        disabled={disabled || context.disabled}
        aria-label={`Eliminar ${itemContext.fileState.file.name}`}
        aria-controls={itemContext.id}
        onClick={onClick}
        {...deleteProps}
      >
        {children ?? <TrashIcon />}
      </AttachmentAction>
    </AttachmentActions>
  )
}

interface FileUploadClearProps
  extends React.ComponentProps<"button">, useRender.ComponentProps<"button"> {
  forceMount?: boolean
}

function FileUploadClear(props: FileUploadClearProps) {
  const { render, forceMount = false, disabled, onClick: onClickProp, ...clearProps } = props
  const context = useFileUploadContext(CLEAR_NAME)
  const isDisabled = disabled || context.disabled
  const shouldRender = forceMount || context.fileStates.length > 0

  const onClick = React.useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClickProp?.(event)
      if (!event.defaultPrevented) context.clearFiles()
    },
    [context, onClickProp],
  )

  const element = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        type: "button",
        disabled: isDisabled,
        "aria-controls": context.listId,
        onClick,
      },
      clearProps,
    ),
    render,
    state: {
      slot: "file-upload-clear",
      disabled: isDisabled ? "" : undefined,
    },
  })

  if (!shouldRender) return null

  return element
}

function useFileUpload() {
  const context = useFileUploadContext("useFileUpload")

  return React.useMemo(
    () => ({
      files: context.fileStates.map((fileState) => fileState.file),
      fileStates: context.fileStates,
      open: context.openFileDialog,
      remove: context.removeFile,
      clear: context.clearFiles,
    }),
    [context],
  )
}

export {
  FileUpload,
  FileUploadClear,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  type FileUploadFileState,
  type FileUploadProps,
  FileUploadTrigger,
  useFileUpload,
}
