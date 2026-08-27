import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FormSectionHeading } from "@/components/form-section-heading"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { CATALOGS } from "@/lib/catalogs"
import { toSelectItemsMap, toSelectOptions } from "@/lib/catalog-options"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useMunicipalitiesQuery } from "@/features/establishment/institution/api/query/use-municipalities"
import type { CatalogItem } from "@/types/catalog"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface DomicilioDataFormSectionProps {
  value: EstablishmentDetails["address"]
  onChange: (value: EstablishmentDetails["address"]) => void
  invalidFields?: string[]
  /** Mensaje de error por ruta de campo. */
  errors?: Record<string, string>
  showValidation?: boolean
}

export function DomicilioDataFormSection({
  value,
  onChange,
  invalidFields = [],
  errors = {},
  showValidation = false,
}: DomicilioDataFormSectionProps) {
  const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
  // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
  const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
  const { data: municipalities = [] } = useMunicipalitiesQuery()
  const { data: zones = [] } = useCatalogQuery<CatalogItem>(CATALOGS.ZONES)
  const municipalityItems = municipalities.map((municipality) => ({
    value: municipality.id,
    label: `${municipality.id} - ${municipality.name}`,
  }))
  const zoneItems = toSelectOptions(zones)

  // `gap-2` puertas adentro: encabezado y filas de esta sección van al mismo
  // paso. El salto mayor entre secciones lo pone el `gap-6` del formulario.
  return (
    <div className="grid gap-2">
      <FormSectionHeading>Domicilio</FormSectionHeading>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid("address.municipality") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-municipio">Municipio*</FieldLabel>
          <ComboboxField
            value={value.municipality?.id ?? null}
            aria-invalid={isInvalid("address.municipality")}
            onValueChange={(selectedValue) => {
              const municipality = municipalities.find((item) => item.id === selectedValue)
              if (municipality) onChange({ ...value, municipality })
            }}
            items={toSelectItemsMap(municipalityItems)}
          >
            <ComboboxFieldTrigger aria-invalid={isInvalid("address.municipality")}>
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>

            <ComboboxFieldContent>
              {municipalityItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
          <FieldError>{errorFor("address.municipality")}</FieldError>
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="establishment-zone">Zona</FieldLabel>
          <ComboboxField
            value={value.zone?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = zones.find((item) => item.id === selectedValue)
              if (option) onChange({ ...value, zone: option })
            }}
            items={toSelectItemsMap(zoneItems)}
          >
            <ComboboxFieldTrigger>
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>

            <ComboboxFieldContent>
              {zoneItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="establishment-barrio">Barrio</FieldLabel>
          <Input
            id="establishment-barrio"
            placeholder="Agregar"
            // TESTABLECIMIENTO.BARRIO es VARCHAR(130).
            maxLength={130}
            value={value.district?.name ?? ""}
            // No es un catálogo real: es texto libre con la forma de
            // `CatalogItem` para reusar el tipo de `address`. El `id`
            // no se lee en ningún otro lado, así que un 0 fijo alcanza.
            onChange={(event) =>
              onChange({
                ...value,
                district: { id: 0, code: event.target.value, name: event.target.value },
              })
            }
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="establishment-address">Dirección</FieldLabel>
          <Input
            id="establishment-address"
            placeholder="Agregar"
            // TESTABLECIMIENTO.DIRECCION es VARCHAR(130).
            maxLength={130}
            value={value.address}
            onChange={(event) => onChange({ ...value, address: event.target.value })}
          />
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="establishment-comuna">Comuna</FieldLabel>
          <Input
            id="establishment-comuna"
            placeholder="Agregar"
            // TESTABLECIMIENTO.COMUNA es VARCHAR(130).
            maxLength={130}
            value={value.commune?.name ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                commune: { id: 0, code: event.target.value, name: event.target.value },
              })
            }
          />
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="establishment-localidad">Localidad</FieldLabel>
          <Input
            id="establishment-localidad"
            placeholder="Agregar"
            // TESTABLECIMIENTO.LOCALIDAD es VARCHAR(130).
            maxLength={130}
            value={value.locality?.name ?? ""}
            onChange={(event) =>
              onChange({
                ...value,
                locality: { id: 0, code: event.target.value, name: event.target.value },
              })
            }
          />
        </Field>
      </div>
    </div>
  )
}
