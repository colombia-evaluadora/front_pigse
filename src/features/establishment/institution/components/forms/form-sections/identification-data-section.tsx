import { FormSectionHeading } from "@/components/form-section-heading"
import { ImageUploadField } from "@/components/image-upload-field"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { useOwnershipTypesQuery } from "@/features/establishment/institution/api/query/use-ownership-types"
import { toSelectItemsMap, toSelectOptions } from "@/lib/catalog-options"
import { toDigitsOnly, toNitInput } from "@/lib/text-input"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface IdentificationDataFormSectionProps {
  value: EstablishmentDetails["basicInfo"]
  onChange: (value: EstablishmentDetails["basicInfo"]) => void
  invalidFields?: string[]
  /** Mensaje de error por ruta de campo. */
  errors?: Record<string, string>
  showValidation?: boolean
  /**
   * Escudo recién elegido, todavía sin subir. Vive en la página porque es
   * ella la que lo manda como el archivo `logo` del multipart al guardar.
   */
  shield: File | null
  onShieldChange: (file: File | null) => void
}

export function IdentificationDataFormSection({
  value,
  onChange,
  invalidFields = [],
  errors = {},
  showValidation = false,
  shield,
  onShieldChange,
}: IdentificationDataFormSectionProps) {
  const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
  // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
  const errorFor = (field: string) => (showValidation ? errors[field] : undefined)
  const { data: legalTypes = [] } = useOwnershipTypesQuery()
  const legalTypeItems = toSelectOptions(legalTypes)

  // `gap-2` puertas adentro: encabezado y filas de esta sección van al mismo
  // paso. El salto mayor entre secciones lo pone el `gap-6` del formulario.
  return (
    <div className="grid gap-2">
      <FormSectionHeading>Datos de identificación</FormSectionHeading>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
        {/*
                    El escudo ocupa una sola columna y se estira a lo alto de las
                    dos filas de campos que tiene al lado, de ahí el `row-span-2`.
                    El campo no aporta altura propia (ver `ImageUploadField`), así
                    que esas dos filas las siguen midiendo solo los inputs.
                */}
        <ImageUploadField
          value={shield}
          onValueChange={onShieldChange}
          description="para cargar el escudo o logo del establecimiento"
          deleteLabel="Eliminar escudo"
          error={errorFor("basicInfo.logo")}
          className="md:row-span-2"
          existingPreview={
            value.logoArchivoId == null ? undefined : (
              <ArchivoImage archivoId={value.logoArchivoId} alt="Escudo del establecimiento" />
            )
          }
        />
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid("basicInfo.name") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-name">Nombre del establecimiento*</FieldLabel>
          <Input
            id="establishment-name"
            placeholder="Agregar"
            // TESTABLECIMIENTO.NOMBRE es VARCHAR(130).
            maxLength={130}
            value={value.name}
            aria-invalid={isInvalid("basicInfo.name")}
            onChange={(event) => onChange({ ...value, name: event.target.value })}
          />
          <FieldError>{errorFor("basicInfo.name")}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid("basicInfo.dane") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-dane">Código DANE*</FieldLabel>
          <Input
            id="establishment-dane"
            placeholder="Agregar"
            // Mismo criterio que tenía el NIT antes de acotarse a
            // 10 dígitos con guión: solo números, sin letras,
            // máximo 12 caracteres.
            inputMode="numeric"
            maxLength={12}
            value={value.dane}
            aria-invalid={isInvalid("basicInfo.dane")}
            onChange={(event) => onChange({ ...value, dane: toDigitsOnly(event.target.value, 12) })}
          />
          <FieldError>{errorFor("basicInfo.dane")}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid("basicInfo.nit") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-nit">Nit*</FieldLabel>
          <Input
            id="establishment-nit"
            placeholder="Agregar"
            // REV: ya no son 12 dígitos planos — un NIT
            // colombiano son 9 dígitos + 1 de verificación (10
            // en total), con un guión que se inserta solo antes
            // del último a medida que se escribe ("900123456-7").
            // `maxLength` cuenta el guión aparte de los 10 dígitos.
            inputMode="numeric"
            maxLength={11}
            value={value.nit}
            aria-invalid={isInvalid("basicInfo.nit")}
            onChange={(event) => onChange({ ...value, nit: toNitInput(event.target.value) })}
          />
          <FieldError>{errorFor("basicInfo.nit")}</FieldError>
        </Field>
        <Field
          orientation="vertical"
          variant="outlined"
          data-invalid={isInvalid("basicInfo.ownershipType") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-legal-type">Propiedad jurídica*</FieldLabel>
          <ComboboxField
            id="establishment-legal-type"
            aria-invalid={isInvalid("basicInfo.ownershipType")}
            value={value.ownershipType?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = legalTypes.find((item) => item.id === selectedValue)
              if (option) onChange({ ...value, ownershipType: option })
            }}
            items={toSelectItemsMap(legalTypeItems)}
          >
            <ComboboxFieldTrigger aria-invalid={isInvalid("basicInfo.ownershipType")}>
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>

            <ComboboxFieldContent>
              {legalTypeItems.map((item) => (
                <ComboboxFieldItem key={item.value} value={item.value}>
                  {item.label}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
          <FieldError>{errorFor("basicInfo.ownershipType")}</FieldError>
        </Field>
      </div>
    </div>
  )
}
