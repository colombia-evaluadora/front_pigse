import { useForm } from "@tanstack/react-form"
import { CircleDashedIcon, CheckCircleIcon, SpinnerIcon } from "@/components/ui/icons"

import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Field,
  FieldError,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"

import {
  auditFiltersFormSchema,
  type AuditFiltersFormInput,
  type AuditFiltersFormValues,
} from "@/features/administration/audits/api/schema"
import { useAuditSessionStatusesQuery } from "@/features/administration/audits/api/query/use-audit-session-statuses-query"
import { formatDateTimeValue, parseDateTimeValue } from "@/lib/date-time-value"

interface FilterAuditSessionFormProps {
  id: string
  defaultValues: AuditFiltersFormInput
  onSubmit: (values: AuditFiltersFormValues) => void
  // El input de autor vive en el buscador del InputGroup; cuando `hideAuthor`
  // es `true` se omite del form del popover y se conserva como "search".
  hideAuthor?: boolean
}

export function FilterAuditSessionForm({
  id,
  defaultValues,
  onSubmit,
  hideAuthor = false,
}: FilterAuditSessionFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: auditFiltersFormSchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  })

  // Las opciones de estado las entrega el backend como `{ key, label }`.
  const { data: statusOptions = [], isPending: isLoadingStatuses } =
    useAuditSessionStatusesQuery()

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-5 px-4"
    >
      {!hideAuthor && (
        <form.Field
          name="author"
          children={(field) => (
            <Field orientation="vertical" variant="outlined" className="gap-2">
              <FieldLabel htmlFor={field.name}>Autor / IP</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                size="sm"
                autoComplete="off"
                placeholder="Agregar"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
              />
            </Field>
          )}
        />
      )}

      <form.Field
        name="status"
        children={(field) => (
          <FieldSet>
            <FieldLegend variant="label">Estado</FieldLegend>
            {isLoadingStatuses ? (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <SpinnerIcon className="size-3 animate-spin" />
                Cargando estados…
              </div>
            ) : (
              // Selección única: el valor del form es un único `status` (o
              // "" para "sin filtro"). La URL sigue almacenando un array
              // (`statuses`) — la conversión vive en el hook.
              <ToggleGroup
                // El form lleva un `status` único (string); Base UI lo espera
                // como array porque internamente modela single-select como
                // array de 0-1 elementos. Convertimos en el borde.
                value={field.state.value ? [field.state.value] : []}
                onValueChange={(value) => field.handleChange(value[0] ?? "")}
                multiple={false}
                spacing={0}
                variant="outline"
                className="w-full"
              >
                {statusOptions.map((option) => (
                  <ToggleGroupItem
                    key={option.key}
                    value={option.key}
                    size="sm"
                    aria-label={`Filtrar por ${option.label}`}
                    className="min-w-0 flex-1 gap-1.5"
                  >
                    {option.key === "active" ? (
                      <CircleDashedIcon className="size-4 shrink-0" />
                    ) : (
                      <CheckCircleIcon className="size-4 shrink-0" />
                    )}
                    <span className="truncate">{option.label}</span>
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </FieldSet>
        )}
      />

      {/* Dos campos independientes (no un único rango) — cada uno usa el
          modo `datetime`, que combina calendario y hora en el mismo popover
          para no tener que abrir dos controles distintos. La leyenda sí aporta
          acá: "Desde" y "Hasta" por separado no dicen de qué son. */}
      <FieldSet>
        <FieldLegend variant="label">Rango de fecha</FieldLegend>
        <div className="grid grid-cols-2 gap-3">
          <form.Field
            name="startedFrom"
            children={(field) => (
              <Field orientation="vertical" variant="outlined" className="gap-2">
                <FieldLabel htmlFor={field.name}>Desde</FieldLabel>
                <DatePicker
                  mode="datetime"
                  id={field.name}
                  size="sm"
                  value={parseDateTimeValue(field.state.value)}
                  onChange={(date) => field.handleChange(formatDateTimeValue(date))}
                />
              </Field>
            )}
          />
          <form.Field
            name="startedTo"
            children={(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
              return (
                <Field
                  orientation="vertical"
                  variant="outlined"
                  className="gap-2"
                  data-invalid={isInvalid ? "true" : undefined}
                >
                  <FieldLabel htmlFor={field.name}>Hasta</FieldLabel>
                  <DatePicker
                    mode="datetime"
                    id={field.name}
                    size="sm"
                    aria-invalid={isInvalid}
                    value={parseDateTimeValue(field.state.value)}
                    onChange={(date) => field.handleChange(formatDateTimeValue(date))}
                  />
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )
            }}
          />
        </div>
      </FieldSet>
    </form>
  )
}
