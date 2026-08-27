import { IdentificationDataFormSection } from "@/features/establishment/institution/components/forms/form-sections/identification-data-section"
import { DomicilioDataFormSection } from "@/features/establishment/institution/components/forms/form-sections/domicilio-data-section"
import { ContactDataFormSection } from "@/features/establishment/institution/components/forms/form-sections/contact-data-section"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"

interface EstablishmentDetailsFormProps {
  value: EstablishmentDetails
  onChange: (next: EstablishmentDetails) => void
  invalidFields?: string[]
  /** Mensaje de error por ruta de campo (`basicInfo.name`, …). */
  errors?: Record<string, string>
  showValidation?: boolean
  /** Escudo elegido y todavía sin subir; lo manda la página al guardar. */
  shield: File | null
  onShieldChange: (file: File | null) => void
}

/**
 * Identificación, domicilio y contacto: los tres datos que describen al
 * establecimiento en sí, así que van juntos en una sola card. La información
 * complementaria es un bloque aparte —la monta la página en su propia card,
 * igual que rector y secretaria— y por eso no se arma acá.
 */
export function EstablishmentDetailsForm({
  value,
  onChange,
  invalidFields = [],
  errors = {},
  showValidation = false,
  shield,
  onShieldChange,
}: EstablishmentDetailsFormProps) {
  // Dos escalas: dentro de una sección las filas van a `gap-2`, y entre
  // secciones el salto es `gap-6`, para que cada encabezado se lea como el
  // arranque de un bloque nuevo y no como una fila más.
  return (
    <div className="grid grid-cols-1 gap-6">
      <IdentificationDataFormSection
        value={value.basicInfo}
        onChange={(basicInfo) => onChange({ ...value, basicInfo })}
        invalidFields={invalidFields}
        errors={errors}
        showValidation={showValidation}
        shield={shield}
        onShieldChange={onShieldChange}
      />
      <DomicilioDataFormSection
        value={value.address}
        onChange={(address) => onChange({ ...value, address })}
        invalidFields={invalidFields}
        errors={errors}
        showValidation={showValidation}
      />
      <ContactDataFormSection
        value={value.contact}
        onChange={(contact) => onChange({ ...value, contact })}
        invalidFields={invalidFields}
        errors={errors}
        showValidation={showValidation}
      />
    </div>
  )
}
