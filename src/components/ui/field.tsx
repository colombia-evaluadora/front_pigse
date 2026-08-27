"use client"

import { useMemo } from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { FieldVariantContext, isFloatingVariant, useFieldVariant } from "@/hooks/use-field-variant"

function FieldSet({ className, ...props }: React.ComponentProps<"fieldset">) {
  return (
    <fieldset
      data-slot="field-set"
      className={cn(
        "flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3",
        className,
      )}
      {...props}
    />
  )
}

function FieldLegend({
  className,
  variant = "legend",
  ...props
}: React.ComponentProps<"legend"> & { variant?: "legend" | "label" }) {
  return (
    <legend
      data-slot="field-legend"
      data-variant={variant}
      className={cn(
        "mb-3 font-semibold uppercase data-[variant=label]:text-xs data-[variant=legend]:text-xs",
        className,
      )}
      {...props}
    />
  )
}

function FieldGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-group"
      className={cn(
        "group/field-group @container/field-group flex w-full flex-col gap-5 data-[slot=checkbox-group]:gap-3 *:data-[slot=field-group]:gap-4",
        className,
      )}
      {...props}
    />
  )
}

// min-w-0: como ítem de grid/flex, el default `min-width: auto` deja que el
// contenido más ancho (p. ej. el valor largo de un Select) estire el campo por
// fuera de su columna. Con esto el campo respeta el ancho y el control recorta.
const fieldVariants = cva("group/field flex w-full min-w-0 gap-2 data-[invalid=true]:text-red", {
  variants: {
    orientation: {
      vertical: "flex-col *:w-full [&>.sr-only]:w-auto",
      horizontal:
        "flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
      responsive:
        "flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:*:data-[slot=field-label]:flex-auto [&>.sr-only]:w-auto @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
    },
    variant: {
      plain: "",
      outlined: "relative mt-2 gap-1.5 [&>[data-slot=field-label]]:w-fit",
      filled: "relative gap-1.5 [&>[data-slot=field-label]]:w-fit",
      standard: "relative mt-3 gap-1.5 [&>[data-slot=field-label]]:w-fit",
    },
  },
  defaultVariants: {
    orientation: "vertical",
    variant: "plain",
  },
})

function Field({
  className,
  orientation = "vertical",
  variant = "plain",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof fieldVariants>) {
  return (
    <FieldVariantContext.Provider value={variant ?? "plain"}>
      <div
        role="group"
        data-slot="field"
        data-orientation={orientation}
        data-variant={variant}
        className={cn(fieldVariants({ orientation, variant }), className)}
        {...props}
      />
    </FieldVariantContext.Provider>
  )
}

function FieldContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-content"
      className={cn("group/field-content flex flex-1 flex-col gap-1 leading-snug", className)}
      {...props}
    />
  )
}

const floatingLabelVariants = cva(
  "pointer-events-none absolute z-10 w-fit origin-left text-sm font-medium normal-case tracking-normal text-foreground transition-colors group-data-[disabled=true]/field:opacity-50 group-data-[invalid=true]/field:text-red group-focus-within/field:text-ring",
  {
    variants: {
      variant: {
        plain: "",
        // El desplazamiento se mide contra la última línea (0.625rem = media
        // línea de text-sm), no contra la altura total: así cada línea extra
        // crece hacia arriba y la de abajo sigue centrada en el borde. Con
        // -translate-y-1/2 un label de dos líneas caía por debajo del borde y
        // tapaba el control.
        outlined: "left-2.5 top-0 -translate-y-[calc(100%-0.625rem)] bg-background rounded-xs px-1",
        filled: "left-3 top-2",
        standard: "left-0 top-0 -translate-y-full",
      },
    },
    defaultVariants: { variant: "plain" },
  },
)

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const variant = useFieldVariant()

  if (isFloatingVariant(variant)) {
    return (
      <Label
        data-slot="field-label"
        className={cn(floatingLabelVariants({ variant }), className)}
        {...props}
      />
    )
  }

  return (
    <Label
      data-slot="field-label"
      className={cn(
        "group/field-label peer/field-label flex w-fit gap-2 leading-relaxed group-data-[disabled=true]/field:opacity-50 has-data-checked:border-primary/30 has-data-checked:bg-primary/5 has-[>[data-slot=field]]:rounded-none has-[>[data-slot=field]]:border *:data-[slot=field]:p-4 dark:has-data-checked:border-primary/20 dark:has-data-checked:bg-primary/10",
        "has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col",
        className,
      )}
      {...props}
    />
  )
}

function FieldTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="field-label"
      className={cn(
        "flex w-fit items-center gap-2 text-xs font-semibold uppercase group-data-[disabled=true]/field:opacity-50 in-data-[slot=field-label]:font-semibold",
        className,
      )}
      {...props}
    />
  )
}

function FieldDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="field-description"
      className={cn(
        "text-left text-sm leading-normal font-normal tracking-normal text-muted-foreground normal-case group-has-data-horizontal/field:text-balance [[data-variant=legend]+&]:-mt-1.5",
        "last:mt-0 nth-last-2:-mt-1",
        "[&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  )
}

function FieldSeparator({
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  children?: React.ReactNode
}) {
  return (
    <div
      data-slot="field-separator"
      data-content={!!children}
      className={cn(
        "relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2",
        className,
      )}
      {...props}
    >
      <Separator className="absolute inset-0 top-1/2" />
      {children && (
        <span
          className="relative mx-auto block w-fit bg-background px-2 text-muted-foreground"
          data-slot="field-separator-content"
        >
          {children}
        </span>
      )}
    </div>
  )
}

function FieldError({
  className,
  children,
  errors,
  ...props
}: React.ComponentProps<"div"> & {
  errors?: Array<{ message?: string } | undefined>
}) {
  const content = useMemo(() => {
    if (children) {
      return children
    }

    if (!errors?.length) {
      return null
    }

    const uniqueErrors = [...new Map(errors.map((error) => [error?.message, error])).values()]

    if (uniqueErrors?.length == 1) {
      return uniqueErrors[0]?.message
    }

    return (
      <ul className="ml-4 flex list-disc flex-col gap-1">
        {uniqueErrors.map((error, index) => error?.message && <li key={index}>{error.message}</li>)}
      </ul>
    )
  }, [children, errors])

  if (!content) {
    return null
  }

  return (
    <div
      role="alert"
      data-slot="field-error"
      className={cn("text-sm font-normal text-red", className)}
      {...props}
    >
      {content}
    </div>
  )
}

export {
  Field,
  FieldLabel,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldContent,
  FieldTitle,
}
