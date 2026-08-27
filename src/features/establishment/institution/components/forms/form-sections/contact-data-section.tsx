import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { FormSectionHeading } from "@/components/form-section-heading"
import { toDigitsOnly } from "@/lib/text-input"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface ContactDataFormSectionProps {
  value: EstablishmentDetails["contact"]
  onChange: (value: EstablishmentDetails["contact"]) => void
  invalidFields?: string[]
  /** Mensaje de error por ruta de campo. */
  errors?: Record<string, string>
  showValidation?: boolean
}

export function ContactDataFormSection({
  value,
  onChange,
  invalidFields = [],
  showValidation = false,
}: ContactDataFormSectionProps) {
  const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
  // `gap-2` puertas adentro: encabezado y filas de esta sección van al mismo
  // paso. El salto mayor entre secciones lo pone el `gap-6` del formulario.
  return (
    <div className="grid gap-2">
      <FormSectionHeading>Datos de contacto</FormSectionHeading>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid("contact.email") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-email">Correo electrónico</FieldLabel>
          <Input
            id="establishment-email"
            placeholder="Agregar"
            // TESTABLECIMIENTO.CORREO_ELECTRONICO es VARCHAR(130).
            maxLength={130}
            value={value.email}
            aria-invalid={isInvalid("contact.email")}
            onChange={(event) => onChange({ ...value, email: event.target.value })}
          />
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="establishment-website">Página web</FieldLabel>
          <Input
            id="establishment-website"
            placeholder="Agregar"
            // TESTABLECIMIENTO.PAGINA_WEB es VARCHAR(130).
            maxLength={130}
            value={value.website}
            onChange={(event) => onChange({ ...value, website: event.target.value })}
          />
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid("contact.phone") ? "true" : undefined}
        >
          <FieldLabel htmlFor="establishment-phone">Teléfono</FieldLabel>
          <Input
            id="establishment-phone"
            placeholder="Agregar"
            // Mismo criterio que el teléfono del establecimiento: solo
            // números, sin letras. TESTABLECIMIENTO.TELEFONO es
            // VARCHAR(130).
            inputMode="numeric"
            maxLength={130}
            value={value.phone}
            aria-invalid={isInvalid("contact.phone")}
            onChange={(event) =>
              onChange({ ...value, phone: toDigitsOnly(event.target.value, 130) })
            }
          />
        </Field>
        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="establishment-fax">fax</FieldLabel>
          <Input
            id="establishment-fax"
            placeholder="Agregar"
            // TESTABLECIMIENTO.FAX es VARCHAR(130), pero es un
            // número de fax: mismo criterio que teléfono, solo
            // dígitos.
            inputMode="numeric"
            maxLength={130}
            value={value.fax ?? ""}
            onChange={(event) => onChange({ ...value, fax: toDigitsOnly(event.target.value, 130) })}
          />
        </Field>
      </div>
    </div>
  )
}
