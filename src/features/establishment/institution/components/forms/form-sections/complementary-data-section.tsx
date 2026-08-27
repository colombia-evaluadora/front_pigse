import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FormSectionHeading } from "@/components/form-section-heading"
import { DatePicker } from "@/components/date-picker"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import type { CatalogItem } from "@/types/catalog"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useDisabilityTypesQuery } from "@/features/establishment/institution/api/query/use-disability-types"
import { CATALOGS } from "@/lib/catalogs"
import { toSelectItemsMap, toSelectOptions } from "@/lib/catalog-options"
import { formatDateValue, parseDateValue } from "@/lib/date-time-value"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface ComplementaryDataFormSectionProps {
  value: EstablishmentDetails["additionalInfo"]
  onChange: (value: EstablishmentDetails["additionalInfo"]) => void
  invalidFields?: string[]
  /** Mensaje de error por ruta de campo. */
  errors?: Record<string, string>
  showValidation?: boolean
}

export function ComplementaryDataFormSection({
  value,
  onChange,
  invalidFields = [],
  showValidation = false,
}: ComplementaryDataFormSectionProps) {
  const isInvalid = (field: string) => showValidation && invalidFields.includes(field)

  const { data: calendarios = [] } = useCatalogQuery<CatalogItem>(CATALOGS.CALENDARIOS)
  const { data: rangosTarifas = [] } = useCatalogQuery<CatalogItem>(CATALOGS.RANGO_TARIFAS)
  const { data: idiomas = [] } = useCatalogQuery<CatalogItem>(CATALOGS.IDIOMAS)
  const { data: costRegimen = [] } = useCatalogQuery<CatalogItem>(CATALOGS.COST_REGIMEN)
  const { data: disabilities = [] } = useDisabilityTypesQuery()
  const { data: populationGenders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.POPULATION_GENDERS)

  const idiomaItems = toSelectOptions(idiomas)
  const calendarioItems = toSelectOptions(calendarios)
  const costRegimenItems = toSelectOptions(costRegimen)
  const populationGenderItems = toSelectOptions(populationGenders)
  const rangoTarifaItems = toSelectOptions(rangosTarifas)
  const disabilityItems = toSelectOptions(disabilities)

  // `gap-2` puertas adentro: encabezado y filas de esta sección van al mismo
  // paso. El salto mayor entre secciones lo pone el `gap-6` del formulario.
  return (
    <div className="grid gap-2">
      {/* Complementary information subsection */}
      <FormSectionHeading>Información complementaria</FormSectionHeading>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
        <Field
          orientation="vertical"
          variant="outlined"
          data-invalid={isInvalid("additionalInfo.approvalResolution") ? "true" : undefined}
        >
          <FieldLabel htmlFor="approval-resolution">Resolución de aprobación</FieldLabel>

          <Input
            id="approval-resolution"
            placeholder="Agregar"
            // TESTABLECIMIENTO.RESOLUCION_APROBACION es VARCHAR(130).
            maxLength={130}
            value={value.approvalResolution}
            aria-invalid={isInvalid("additionalInfo.approvalResolution")}
            onChange={(event) => onChange({ ...value, approvalResolution: event.target.value })}
          />
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          data-invalid={isInvalid("additionalInfo.teachingLanguage") ? "true" : undefined}
        >
          <FieldLabel htmlFor="teaching-language">Idioma de enseñanza</FieldLabel>

          <ComboboxField
            id="teaching-language"
            aria-invalid={isInvalid("additionalInfo.teachingLanguage")}
            value={value.teachingLanguage?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = idiomas.find((item) => item.id === selectedValue)
              if (option) onChange({ ...value, teachingLanguage: option })
            }}
            items={toSelectItemsMap(idiomaItems)}
          >
            <ComboboxFieldTrigger aria-invalid={isInvalid("additionalInfo.teachingLanguage")}>
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>

            <ComboboxFieldContent>
              {idiomaItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid("additionalInfo.calendar") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-calendario">Calendario</FieldLabel>
          <ComboboxField
            id="establishment-calendario"
            aria-invalid={isInvalid("additionalInfo.calendar")}
            value={value.calendar?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = calendarios.find((item) => item.id === selectedValue)
              if (option) onChange({ ...value, calendar: option })
            }}
            items={toSelectItemsMap(calendarioItems)}
          >
            <ComboboxFieldTrigger
              className="w-full"
              aria-invalid={isInvalid("additionalInfo.calendar")}
            >
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {calendarioItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>
        <Field
          orientation="vertical"
          variant="outlined"
          data-invalid={isInvalid("additionalInfo.costRegime") ? "true" : undefined}
        >
          <FieldLabel htmlFor="cost-regime">Régimen de costo</FieldLabel>

          <ComboboxField
            id="cost-regime"
            aria-invalid={isInvalid("additionalInfo.costRegime")}
            value={value.costRegime?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = costRegimen.find((item) => item.id === selectedValue)
              if (option) onChange({ ...value, costRegime: option })
            }}
            items={toSelectItemsMap(costRegimenItems)}
          >
            <ComboboxFieldTrigger aria-invalid={isInvalid("additionalInfo.costRegime")}>
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>

            <ComboboxFieldContent>
              {costRegimenItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid("additionalInfo.populationGender") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-genero">Género de la población atendida</FieldLabel>
          <ComboboxField
            id="establishment-genero"
            aria-invalid={isInvalid("additionalInfo.populationGender")}
            value={value.populationGender?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = populationGenders.find((item) => item.id === selectedValue)
              if (option) onChange({ ...value, populationGender: option })
            }}
            items={toSelectItemsMap(populationGenderItems)}
          >
            <ComboboxFieldTrigger
              className="w-full"
              aria-invalid={isInvalid("additionalInfo.populationGender")}
            >
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {populationGenderItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid("additionalInfo.tuitionRange") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-rango">Rango tarifas</FieldLabel>
          <ComboboxField
            id="establishment-rango"
            aria-invalid={isInvalid("additionalInfo.tuitionRange")}
            value={value.tuitionRange?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = rangosTarifas.find((item) => item.id === selectedValue)
              if (option) onChange({ ...value, tuitionRange: option })
            }}
            items={toSelectItemsMap(rangoTarifaItems)}
          >
            <ComboboxFieldTrigger
              className="w-full"
              aria-invalid={isInvalid("additionalInfo.tuitionRange")}
            >
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {rangoTarifaItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
        <Field
          orientation="vertical"
          variant="outlined"
          data-invalid={isInvalid("additionalInfo.disabilityType") ? "true" : undefined}
        >
          <FieldLabel htmlFor="disabilities">Discapacidades atendidas</FieldLabel>

          <ComboboxField
            id="disabilities"
            aria-invalid={isInvalid("additionalInfo.disabilityType")}
            value={value.disabilityType?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = disabilities.find((item) => item.id === selectedValue)
              if (option) onChange({ ...value, disabilityType: option })
            }}
            items={toSelectItemsMap(disabilityItems)}
          >
            <ComboboxFieldTrigger aria-invalid={isInvalid("additionalInfo.disabilityType")}>
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>

            <ComboboxFieldContent>
              {disabilityItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          data-invalid={isInvalid("additionalInfo.licenseStatus") ? "true" : undefined}
        >
          <FieldLabel htmlFor="license-status">Licencia de funcionamiento</FieldLabel>

          <Input
            id="license-status"
            placeholder="Agregar"
            // TESTABLECIMIENTO.LICENCIA_FUNCIONAMIENTO es VARCHAR(130).
            maxLength={130}
            value={value.licenseStatus}
            aria-invalid={isInvalid("additionalInfo.licenseStatus")}
            onChange={(event) => onChange({ ...value, licenseStatus: event.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
        {/* Mismo recuadro que los sí/no de periodo académico: la
                        etiqueta flota sobre el borde y el grupo comparte alto
                        con los inputs y selects de al lado. */}
        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel>Atención a población perteneciente a etnias</FieldLabel>
          <RadioGroup
            value={value.ethnicAttention ? "si" : "no"}
            onValueChange={(selectedValue) =>
              onChange({ ...value, ethnicAttention: selectedValue === "si" })
            }
            className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
          >
            <label className="flex items-center gap-2">
              <RadioGroupItem value="si" id="etnias-si" />
              Sí
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="no" id="etnias-no" />
              No
            </label>
          </RadioGroup>
        </Field>
        <Field orientation="vertical" variant="outlined">
          <FieldLabel htmlFor="license-date">Fecha licencia</FieldLabel>

          <DatePicker
            id="license-date"
            mode="date"
            value={parseDateValue(value.licenseDate)}
            onChange={(date) => onChange({ ...value, licenseDate: formatDateValue(date) })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2">
        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel>Atención a población con talentos adicionales</FieldLabel>

          <RadioGroup
            value={value.giftedAttention ? "si" : "no"}
            onValueChange={(selectedValue) =>
              onChange({ ...value, giftedAttention: selectedValue === "si" })
            }
            className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
          >
            <label className="flex items-center gap-2">
              <RadioGroupItem value="si" id="talentos-si" />
              Sí
            </label>

            <label className="flex items-center gap-2">
              <RadioGroupItem value="no" id="talentos-no" />
              No
            </label>
          </RadioGroup>
        </Field>
        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel>Ofrece subsidio</FieldLabel>
          <RadioGroup
            value={value.subsidy ? "si" : "no"}
            onValueChange={(selectedValue) =>
              onChange({ ...value, subsidy: selectedValue === "si" })
            }
            className="flex min-h-11 items-center gap-6 rounded-md border border-input px-3"
          >
            <label className="flex items-center gap-2">
              <RadioGroupItem value="si" id="subsidio-si" />
              Sí
            </label>
            <label className="flex items-center gap-2">
              <RadioGroupItem value="no" id="subsidio-no" />
              No
            </label>
          </RadioGroup>
        </Field>
      </div>
    </div>
  )
}
