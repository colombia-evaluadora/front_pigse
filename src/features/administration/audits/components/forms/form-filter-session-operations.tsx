import { useForm } from "@tanstack/react-form"
import { PencilIcon, PlusCircleIcon, TrashIcon, SpinnerIcon } from "@/components/ui/icons"

import { Checkbox } from "@/components/ui/checkbox"
import { DatePicker } from "@/components/date-picker"
import { Input } from "@/components/ui/input"
import {
  Field,
  FieldError,
  FieldContent,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"

import {
  sessionOperationsFiltersFormSchema,
  type SessionOperationsFiltersFormInput,
  type SessionOperationsFiltersFormValues,
} from "@/features/administration/audits/api/schema"
import type { OperationType } from "@/features/administration/audits/api/types/audit-table"
import { useAuditOperationTypesQuery } from "@/features/administration/audits/api/query/use-audit-operation-types-query"
import { formatDateTimeValue, parseDateTimeValue } from "@/lib/date-time-value"

interface FilterSessionOperationsFormProps {
  id: string
  defaultValues: SessionOperationsFiltersFormInput
  onSubmit: (values: SessionOperationsFiltersFormValues) => void
  // El input de tabla vive en el buscador del InputGroup; cuando `hideTableSlug`
  // es `true` se omite del form del popover y se conserva como "search".
  hideTableSlug?: boolean
}

export function FilterSessionOperationsForm({
  id,
  defaultValues,
  onSubmit,
  hideTableSlug = false,
}: FilterSessionOperationsFormProps) {
  const form = useForm({
    defaultValues,
    validators: {
      onSubmit: sessionOperationsFiltersFormSchema,
    },
    onSubmit: ({ value }) => onSubmit(value),
  })

  // Las opciones de tipo de operación las entrega el backend como
  // `{ key, label }`.
  const { data: operationOptions = [], isPending: isLoadingOperations } =
    useAuditOperationTypesQuery()

  // Ícono estable por tipo de operación — la lista viene del back, así que
  // resolvemos el ícono contra el `key` (no contra el label).
  function iconFor(operation: OperationType) {
    if (operation === "INSERT") return PlusCircleIcon
    if (operation === "UPDATE") return PencilIcon
    return TrashIcon
  }

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        form.handleSubmit()
      }}
      className="flex flex-1 flex-col gap-5 px-4"
    >
      <form.Field
        name="operations"
        mode="array"
        children={(field) => {
          const toggle = (operation: OperationType, checked: boolean) => {
            if (checked) {
              field.pushValue(operation)
            } else {
              const index = field.state.value.indexOf(operation)
              if (index > -1) field.removeValue(index)
            }
          }
          return (
            <FieldSet>
              <FieldLegend variant="label">Operación</FieldLegend>
              {isLoadingOperations ? (
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <SpinnerIcon className="size-3 animate-spin" />
                  Cargando tipos de operación…
                </div>
              ) : (
                <FieldGroup className="grid grid-cols-2 gap-3">
                  {operationOptions.map((option) => {
                    const id = `session-operation-filter-${option.key.toLowerCase()}`
                    const Icon = iconFor(option.key)
                    return (
                      <FieldLabel key={option.key} htmlFor={id} className="min-w-0">
                        <Field orientation="horizontal">
                          <Checkbox
                            id={id}
                            name={field.name}
                            checked={field.state.value.includes(option.key)}
                            onCheckedChange={(checked) => toggle(option.key, checked === true)}
                          />
                          <FieldContent className="min-w-0">
                            <FieldTitle className="w-full min-w-0">
                              <Icon className="size-4 shrink-0 text-muted-foreground" />
                              <span className="truncate">{option.label}</span>
                            </FieldTitle>
                          </FieldContent>
                        </Field>
                      </FieldLabel>
                    )
                  })}
                </FieldGroup>
              )}
            </FieldSet>
          )
        }}
      />

      {!hideTableSlug && (
        <form.Field
          name="tableSlug"
          children={(field) => (
            <Field orientation="vertical" variant="outlined">
              <FieldLabel htmlFor={field.name}>Tabla</FieldLabel>
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

      {/* Dos campos independientes (no un único rango) — cada uno usa el
          modo `datetime`, que combina calendario y hora en el mismo popover
          para no tener que abrir dos controles distintos. La leyenda sí aporta
          acá: "Desde" y "Hasta" por separado no dicen de qué son. */}
      <FieldSet>
        <FieldLegend variant="label">Rango de fecha</FieldLegend>
        <div className="grid grid-cols-2 gap-3">
          <form.Field
            name="occurredFrom"
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
            name="occurredTo"
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
