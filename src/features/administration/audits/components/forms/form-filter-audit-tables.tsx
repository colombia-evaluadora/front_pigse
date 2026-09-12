import { useForm } from "@tanstack/react-form"
import { MagnifyingGlassIcon } from "@/components/ui/icons"

import { Input } from "@/components/ui/input"
import { Field, FieldLabel } from "@/components/ui/field"

import {
  type AuditTablesFiltersFormInput,
  type AuditTablesFiltersFormValues,
} from "@/features/administration/audits/api/schema"

const DEBOUNCE_MS = 300

interface FilterAuditTablesFormProps {
  id: string
  defaultValues: AuditTablesFiltersFormInput
  onSubmit: (values: AuditTablesFiltersFormValues) => void
}

export function FilterAuditTablesForm({ id, defaultValues, onSubmit }: FilterAuditTablesFormProps) {
  // Este form es un "buscar al tipear" sin botón submit: el debounce vive en
  // el `validator.onChangeAsync` del campo y dispara la consulta cuando el
  // usuario deja de escribir. No declaramos `validators.onSubmit` ni
  // `onSubmit` en el `useForm` porque nunca se ejecutarían — el submit real
  // lo hace el campo, no el form.
  const form = useForm({
    defaultValues,
  })

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
      }}
      className="flex flex-col gap-2"
    >
      <form.Field
        name="name"
        asyncDebounceMs={DEBOUNCE_MS}
        validators={{
          onChangeAsync: async ({ value }) => {
            onSubmit({ name: value })
            return undefined
          },
        }}
      >
        {(field) => (
          <Field orientation="vertical" variant="outlined" className="w-full sm:w-72">
            <FieldLabel htmlFor={field.name}>Buscar</FieldLabel>
            <div className="relative w-full">
              <MagnifyingGlassIcon className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id={field.name}
                name={field.name}
                type="search"
                variant="outlined"
                size="sm"
                autoComplete="off"
                placeholder="Agregar"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(event) => field.handleChange(event.target.value)}
                className="rounded-md pl-8"
              />
            </div>
          </Field>
        )}
      </form.Field>
    </form>
  )
}
