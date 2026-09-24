import { useForm } from "@tanstack/react-form"

import {
  Field,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { SpinnerIcon } from "@/components/ui/icons"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toSelectItemsMap } from "@/lib/catalog-options"

import {
  userActivityFiltersFormSchema,
  type UserActivityFiltersFormInput,
  type UserActivityFiltersFormValues,
} from "@/features/administration/user-activity/api/schema"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import {
  USER_ACTIVITY_STATUSES,
  type UserActivityStatus,
} from "@/features/administration/user-activity/api/types/user-activity"
import { USER_ACTIVITY_STATUS_LABELS } from "@/features/administration/user-activity/api/ui-mappings"

interface FilterUserActivityFormProps {
  id: string
  defaultValues: UserActivityFiltersFormInput
  onSubmit: (values: UserActivityFiltersFormValues) => void
}

const ESTADO_ITEMS = toSelectItemsMap(
  USER_ACTIVITY_STATUSES.map((estado) => ({ value: estado, label: USER_ACTIVITY_STATUS_LABELS[estado] })),
)

/**
 * Filtros avanzados de "Actividad de usuarios": Establecimiento (todo PIGSE,
 * sin acotar al del usuario que consulta — los 6 roles habilitados ven todo)
 * y Estado (`EN_LINEA` / `DESCONECTADO` / `SIN_INGRESO`, ver
 * `USER_ACTIVITY_STATUSES`). El buscador de texto libre vive en la barra,
 * afuera de este form (mismo criterio que `FilterAuditSessionForm`).
 */
export function FilterUserActivityForm({ id, defaultValues, onSubmit }: FilterUserActivityFormProps) {
  const form = useForm({
    defaultValues,
    validators: { onSubmit: userActivityFiltersFormSchema },
    onSubmit: ({ value }) => onSubmit(value),
  })

  const { data: establishments = [], isPending: isLoadingEstablishments } = useEstablishmentsOptionsQuery()

  const establishmentItems = toSelectItemsMap(
    establishments.map((establishment) => ({ value: establishment.id, label: establishment.name })),
  )

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
        name="establecimientoId"
        children={(field) => (
          <Field orientation="vertical" variant="outlined" className="gap-2">
            <FieldLabel htmlFor={field.name}>Establecimiento</FieldLabel>
            <Select
              value={field.state.value || "__all__"}
              onValueChange={(value) => field.handleChange(!value || value === "__all__" ? "" : value)}
              items={establishmentItems}
              disabled={isLoadingEstablishments}
            >
              <SelectTrigger id={field.name} size="sm">
                <SelectValue placeholder={isLoadingEstablishments ? "Cargando…" : "Todos"}>
                  {(value) => (value === "__all__" ? "Todos" : (establishmentItems[value] ?? "Todos"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {establishments.map((establishment) => (
                  <SelectItem key={establishment.id} value={String(establishment.id)}>
                    {establishment.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isLoadingEstablishments && (
              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                <SpinnerIcon className="size-3 animate-spin" />
                Cargando establecimientos…
              </div>
            )}
          </Field>
        )}
      />

      <form.Field
        name="estado"
        children={(field) => (
          <FieldSet>
            <FieldLegend variant="label">Estado</FieldLegend>
            <Select
              value={field.state.value || "__all__"}
              onValueChange={(value) =>
                field.handleChange(!value || value === "__all__" ? "" : (value as UserActivityStatus))
              }
              items={ESTADO_ITEMS}
            >
              <SelectTrigger id={field.name} size="sm">
                <SelectValue placeholder="Todos">
                  {(value) => (value === "__all__" ? "Todos" : (ESTADO_ITEMS[value] ?? "Todos"))}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {USER_ACTIVITY_STATUSES.map((estado) => (
                  <SelectItem key={estado} value={estado}>
                    {USER_ACTIVITY_STATUS_LABELS[estado]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldSet>
        )}
      />
    </form>
  )
}
