import { useEffect, useRef, useState } from "react"
import { format } from "date-fns"

import { DatePicker } from "@/components/date-picker"
import { FormSectionHeading } from "@/components/form-section-heading"
import { NoticeBanner } from "@/components/notice/notice-banner"
import { ImageUploadField } from "@/components/image-upload-field"
import { ArchivoImage } from "@/features/files/components/archivo-image"
import { EMPLOYEE_ROLES } from "@/mocks/db/catalogs/employee-roles"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { CATALOGS } from "@/lib/catalogs"
import { DATE_VALUE_FORMAT, parseDateValue } from "@/lib/date-time-value"
import { toDigitsOnly } from "@/lib/text-input"
import type { CatalogItem } from "@/types/catalog"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { findPersonByDocument } from "@/features/establishment/employees/api/query/use-user-by-document"
import type { Person } from "@/features/establishment/employees/api/types/person"

type EmployeeRoleCode = (typeof EMPLOYEE_ROLES)[number]["code"]

/**
 * Valor decorativo que se muestra (y se manda) cuando `person.accountExists`
 * es `true` — nunca es una contraseña real ni se usa como tal: el backend
 * (`FuncionarioRegistrationService`, REV V71) reutiliza la cuenta existente
 * por documento/correo y jamás toca su contraseña en ese camino. Solo tiene
 * que ser una cadena no vacía para no chocar con `@NotBlank` del lado Java.
 */
const PASSWORD_PLACEHOLDER = "••••••••"

interface UserFormProps {
  role?: EmployeeRoleCode
  fieldPrefix?: string
  value: Person | null
  onChange: (person: Person | null) => void
  invalidFields?: string[]
  /** Mensaje de error por ruta de campo. */
  errors?: Record<string, string>
  showValidation?: boolean
  /**
   * ¿Los 4 mínimos (tipo/número de documento, primer nombre, primer
   * apellido) llevan asterisco? `true` por defecto — el único caso hoy
   * donde la persona entera es opcional (puede no existir) es la
   * secretaria del establecimiento, que pasa `false` acá.
   */
  required?: boolean
  /**
   * Estado UI para la confirmación de contraseña. Vive fuera de la entidad
   * `Person` porque es un dato de formulario, no un atributo de negocio.
   * Si se provee, el form se vuelve controlado en ese campo; si no, lo
   * maneja internamente.
   */
  confirmPassword?: string
  onConfirmPasswordChange?: (value: string) => void
  /**
   * Foto recién elegida, todavía sin subir. Igual que el escudo del
   * establecimiento, vive en el padre: es él quien la manda como
   * `fkTarchivoFoto` del multipart al registrar o actualizar. Sin estas dos
   * props el campo sigue funcionando, pero la foto no se persiste.
   */
  photo?: File | null
  onPhotoChange?: (file: File | null) => void
  /**
   * Se dispara con el patch crudo que devolvió `findPersonByDocument`
   * (antes de mezclarlo con `PASSWORD_PLACEHOLDER`) cada vez que el
   * autocompletado encuentra o pierde una coincidencia — `null` cuando el
   * documento cambia y se resetea el match anterior. El padre lo usa para
   * dos cosas que este form no puede decidir por sí solo: (1) si el match
   * ya trae `id` (ya es funcionario activo), tratar el alta como edición
   * de ese `id` desde ya; (2) si no trae `id` (solo existe la cuenta),
   * guardar el snapshot para poder detectar más tarde si el usuario editó
   * algún campo antes de guardar y encadenar un PATCH además del alta
   * (ver `personDataChangedSinceMatch`, `person.ts`).
   */
  onMatched?: (found: Partial<Person> | null) => void
}

function createEmptyPerson(): Person {
  return {
    documentType: null,
    identification: "",
    firstName: "",
    lastName: "",
    birthDate: "",
    gender: null,
    email: "",
    phone: "",
    password: "",
  }
}

export function UserDetailsForm({
  role,
  fieldPrefix = "principal",
  value,
  onChange,
  invalidFields = [],
  errors = {},
  showValidation = false,
  required = true,
  confirmPassword: confirmPasswordProp,
  onConfirmPasswordChange,
  photo: photoProp,
  onPhotoChange,
  onMatched,
}: UserFormProps) {
  // El encabezado solo nombra el rol de la persona (Rector, Secretaria). Sin
  // `role` no hay nada que anunciar y el contenedor ya pone su propio título
  // —en el diálogo de usuario lo duplicaba—, así que se omite.
  const roleName = EMPLOYEE_ROLES.find((item) => item.code === role)?.name ?? null

  // Local a esta instancia (no el `notify()` compartido de la página):
  // rector y secretaria son dos `UserDetailsForm` separados en la misma
  // pantalla, así que el aviso de "cuenta encontrada" tiene que quedar
  // pegado a la sección que lo disparó, no a un outlet único compartido.
  const [accountNotice, setAccountNotice] = useState<{ id: number; message: string } | null>(null)
  const accountNoticeIdRef = useRef(0)

  const { data: documentTypes = [] } = useCatalogQuery<CatalogItem>(CATALOGS.DOCUMENT_TYPES)
  const { data: genders = [] } = useCatalogQuery<CatalogItem>(CATALOGS.GENDERS)
  const documentTypeLabels = Object.fromEntries(documentTypes.map((item) => [item.id, item.name]))
  const genderLabels = Object.fromEntries(genders.map((item) => [item.id, item.name]))
  const person = value ?? createEmptyPerson()

  const isConfirmControlled = confirmPasswordProp !== undefined
  // El form puede correr en dos modos:
  // - **Controlado**: el padre pasa `confirmPassword` y `onConfirmPasswordChange`
  //   (necesita el valor para su propia validación, ver
  //   `validate-establishment-form.ts`). El form es un espejo.
  // - **No controlado**: el form guarda el valor localmente. Como `confirmPassword`
  //   no es parte del modelo `Person`, queda acá hasta el submit.
  const [internalConfirmPassword, setInternalConfirmPassword] = useState(() => person.password)
  const confirmPassword = isConfirmControlled ? confirmPasswordProp : internalConfirmPassword

  // Foto del usuario, con el mismo doble modo que la confirmación de
  // contraseña: si el padre pasa `photo`/`onPhotoChange` la manda él al
  // backend; si no, queda acá y solo vive mientras el form está montado.
  // No es parte de `Person` porque el modelo guarda el `pk_tarchivo` que
  // devuelve el backend, no el `File` que el usuario acaba de elegir.
  const isPhotoControlled = photoProp !== undefined
  const [internalPhoto, setInternalPhoto] = useState<File | null>(null)
  const photo = isPhotoControlled ? photoProp : internalPhoto
  const setPhoto = (next: File | null) => {
    if (isPhotoControlled) {
      onPhotoChange?.(next)
      return
    }
    setInternalPhoto(next)
  }

  // Sincroniza la confirmación cuando el padre **carga otra persona** (no
  // solo edita la actual). El `useEffect` original re-sincronizaba cada vez
  // que el confirm quedaba vacío, pisando la edición del usuario sin razón.
  // Ahora solo dispara cuando cambia el `id` — la "primera vez" + cada
  // carga de un registro distinto.
  const lastSeenId = useRef(person.id)
  useEffect(() => {
    if (isConfirmControlled) return
    if (lastSeenId.current === person.id) return
    lastSeenId.current = person.id
    setInternalConfirmPassword(person.password)
  }, [isConfirmControlled, person.id, person.password])

  const setConfirmPassword = (next: string) => {
    if (isConfirmControlled) {
      onConfirmPasswordChange?.(next)
      return
    }
    setInternalConfirmPassword(next)
  }

  const passwordsMatch = person.password === confirmPassword
  const isInvalid = (field: string) => showValidation && invalidFields.includes(field)
  // Mensaje debajo del campo: solo tras el primer submit, igual que el borde rojo.
  const errorFor = (field: string) => (showValidation ? errors[field] : undefined)

  const emitChange = (patch: Partial<Person>) => {
    onChange({ ...person, ...patch })
  }

  // Autocompletado: cuando hay tipo + número de documento, busca un
  // TUSUARIO existente y vuelca sus datos sobre el form (nunca pisa
  // `password` con datos reales, que no existe en TUSUARIO). Debounced
  // para no pegarle al backend en cada tecla; se ignora la respuesta si
  // el documento cambió mientras la búsqueda estaba en vuelo (evita
  // pisar el form con datos de una búsqueda vieja).
  const documentTypeId = person.documentType?.id ?? null
  const identification = person.identification
  // Solo gobierna el toast, NO si la búsqueda corre: la búsqueda tiene que
  // correr también al abrir "editar" (para que el password quede con el
  // placeholder + bloqueado si la persona ya tiene cuenta, igual que en
  // alta) — lo que no queremos ahí es el aviso de "cuenta encontrada",
  // porque nadie tecleó nada, solo se cargó un registro que ya la tenía.
  const isUserEditingDocument = useRef(false)
  useEffect(() => {
    if (!documentTypeId || !identification.trim()) return

    // Reset optimista: en cuanto el documento cambia, ya no se puede
    // asumir que sigue siendo la cuenta (ni, si la había, el
    // TFUNCIONARIO ni la foto) que encontró la búsqueda anterior — se
    // desbloquea la contraseña y se limpia el `id`/`photoArchivoId`
    // heredados del match previo, y el lookup de abajo los vuelve a
    // completar solo si el documento nuevo también coincide con una
    // cuenta real. Sin este reset, cambiar de documento hacia una
    // persona SIN foto seguía mostrando la foto de la persona anterior.
    if (person.accountExists) {
      emitChange({ accountExists: false, password: "", id: undefined, photoArchivoId: null })
      setConfirmPassword("")
      onMatched?.(null)
      setAccountNotice(null)
    }

    let cancelled = false
    const timer = setTimeout(() => {
      findPersonByDocument(documentTypeId, identification)
        .then((found) => {
          if (cancelled || !found) return
          // `found.accountExists` ya viene en `true` (ver
          // use-user-by-document.ts) — acá solo se agrega el
          // valor decorativo de la contraseña, nunca una real.
          // `onMatched` viaja ANTES de mezclar el placeholder: el
          // padre necesita el patch crudo tal cual vino del
          // backend, no la contraseña decorativa.
          onMatched?.(found)
          emitChange({ ...found, password: PASSWORD_PLACEHOLDER })
          setConfirmPassword(PASSWORD_PLACEHOLDER)
          if (isUserEditingDocument.current) {
            accountNoticeIdRef.current += 1
            setAccountNotice({
              id: accountNoticeIdRef.current,
              message:
                "Ya existe una cuenta con este documento: se completaron sus datos automáticamente.",
            })
          }
        })
        .catch(() => {
          // Búsqueda opcional: si falla, el usuario sigue
          // llenando el form a mano — no se interrumpe con un
          // toast por algo que no bloquea el flujo.
        })
    }, 500)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo debe
    // re-disparar cuando cambia el documento, no en cada cambio de `person`
    // (si no, el autofill de esta misma búsqueda la volvería a disparar).
  }, [documentTypeId, identification])

  return (
    <div className="grid grid-cols-1 gap-2">
      <NoticeBanner
        notice={accountNotice}
        onClose={() => setAccountNotice(null)}
        variant="success"
        autoCloseMs={7000}
      />
      {roleName ? <FormSectionHeading>{roleName}</FormSectionHeading> : null}
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
        {/* Foto */}
        {/*
                    `row-span-3` porque al lado van seis campos en dos columnas:
                    con menos filas, los últimos se salían del bloque de la
                    derecha y caían debajo de la foto, en la primera columna.
                    El campo no aporta altura propia (ver `ImageUploadField`),
                    así que esas tres filas las siguen midiendo solo los inputs.
                */}
        <ImageUploadField
          value={photo}
          onValueChange={setPhoto}
          description="para cargar la foto del usuario"
          deleteLabel="Eliminar foto"
          error={errorFor(`${fieldPrefix}.photo`)}
          className="md:row-span-3"
          existingPreview={
            person.photoArchivoId == null ? undefined : (
              <ArchivoImage archivoId={person.photoArchivoId} alt="Foto de perfil" />
            )
          }
        />
        {/* Formulario */}

        <Field
          orientation="vertical"
          variant="outlined"
          data-invalid={isInvalid(`${fieldPrefix}.documentType`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="document-type">Tipo de documento{required ? "*" : ""}</FieldLabel>

          <ComboboxField
            id="document-type"
            items={documentTypeLabels}
            aria-invalid={isInvalid(`${fieldPrefix}.documentType`)}
            value={person.documentType?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = documentTypes.find((item) => item.id === selectedValue)
              if (option) {
                isUserEditingDocument.current = true
                emitChange({ documentType: option })
              }
            }}
          >
            <ComboboxFieldTrigger size="sm" aria-invalid={isInvalid(`${fieldPrefix}.documentType`)}>
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {documentTypes.map((item) => (
                <ComboboxFieldItem key={item.id} value={item.id} title={item.name}>
                  {item.name}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
          <FieldError>{errorFor(`${fieldPrefix}.documentType`)}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid(`${fieldPrefix}.identification`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="document-number">
            Número de documento{required ? "*" : ""}
          </FieldLabel>
          <Input
            id="document-number"
            size="sm"
            placeholder="Agregar"
            // TUSUARIO.IDENTIFICACION es VARCHAR(30) puramente
            // numérico (RegisterUsuarioRequest la valida igual,
            // @Size(max=30)) — solo dígitos, sin letras.
            inputMode="numeric"
            maxLength={30}
            value={person.identification}
            aria-invalid={isInvalid(`${fieldPrefix}.identification`)}
            onChange={(event) => {
              isUserEditingDocument.current = true
              emitChange({ identification: toDigitsOnly(event.target.value, 30) })
            }}
          />
          <FieldError>{errorFor(`${fieldPrefix}.identification`)}</FieldError>
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid(`${fieldPrefix}.firstName`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="user-name">Primer Nombre{required ? "*" : ""}</FieldLabel>
          <Input
            id="user-name"
            size="sm"
            placeholder="Agregar"
            value={person.firstName}
            aria-invalid={isInvalid(`${fieldPrefix}.firstName`)}
            onChange={(event) => emitChange({ firstName: event.target.value })}
          />
          <FieldError>{errorFor(`${fieldPrefix}.firstName`)}</FieldError>
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="user-second-name">Segundo Nombre</FieldLabel>
          <Input
            id="user-second-name"
            size="sm"
            placeholder="Agregar"
            value={person.middleName ?? ""}
            onChange={(event) => emitChange({ middleName: event.target.value })}
          />
        </Field>

        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid(`${fieldPrefix}.lastName`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="user-last-name">Primer Apellido{required ? "*" : ""}</FieldLabel>
          <Input
            id="user-last-name"
            size="sm"
            placeholder="Agregar"
            value={person.lastName}
            aria-invalid={isInvalid(`${fieldPrefix}.lastName`)}
            onChange={(event) => emitChange({ lastName: event.target.value })}
          />
          <FieldError>{errorFor(`${fieldPrefix}.lastName`)}</FieldError>
        </Field>

        <Field orientation="vertical" variant="outlined" className="w-full">
          <FieldLabel htmlFor="user-second-last-name">Segundo Apellido</FieldLabel>
          <Input
            id="user-second-last-name"
            size="sm"
            placeholder="Agregar"
            value={person.secondLastName ?? ""}
            onChange={(event) => emitChange({ secondLastName: event.target.value })}
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid(`${fieldPrefix}.email`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="user-email">Correo Electrónico</FieldLabel>
          <Input
            id="user-email"
            size="sm"
            placeholder="Agregar"
            value={person.email}
            aria-invalid={isInvalid(`${fieldPrefix}.email`)}
            onChange={(event) => emitChange({ email: event.target.value })}
          />
          <FieldError>{errorFor(`${fieldPrefix}.email`)}</FieldError>
        </Field>
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid(`${fieldPrefix}.password`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="user-password">
            Contraseña
            {person.accountExists ? " (cuenta existente)" : ""}
          </FieldLabel>
          <Input
            id="user-password"
            size="sm"
            placeholder="Agregar"
            type="password"
            // El backend nunca devuelve el hash, así que este
            // campo siempre arranca vacío al editar — pero el
            // navegador no lo sabe: al ver un `type="password"`
            // sin pista, Chrome/el gestor de contraseñas lo
            // autocompletaba con la contraseña guardada de esa
            // cuenta (sin tocar "Confirmar", que sí quedaba
            // vacío), disparando "las contraseñas no coinciden"
            // sin que el usuario escribiera nada.
            // `autoComplete="new-password"` es la señal estándar
            // para "esto no es un login, es un campo para poner
            // una contraseña nueva" — ningún navegador debería
            // autorellenarlo con una guardada.
            autoComplete="new-password"
            // `accountExists`: el autocompletado por documento
            // encontró una cuenta real — se bloquea el campo (con
            // el valor decorativo `PASSWORD_PLACEHOLDER`) para
            // que quede claro que la persona se liga siendo la
            // misma, sin poder cambiarle la contraseña desde acá.
            disabled={person.accountExists}
            value={person.password}
            aria-invalid={isInvalid(`${fieldPrefix}.password`)}
            onChange={(event) => emitChange({ password: event.target.value })}
          />
          <FieldError>{errorFor(`${fieldPrefix}.password`)}</FieldError>
        </Field>
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid(`${fieldPrefix}.confirmPassword`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="user-confirm-password">Confirmar Contraseña</FieldLabel>
          <Input
            id="user-confirm-password"
            size="sm"
            placeholder="Agregar"
            type="password"
            // Mismo motivo que "user-password": sin esto el
            // navegador podía autocompletar uno de los dos
            // campos (no necesariamente el mismo) y producir un
            // mismatch fantasma.
            autoComplete="new-password"
            disabled={person.accountExists}
            value={confirmPassword}
            aria-invalid={isInvalid(`${fieldPrefix}.confirmPassword`)}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          <FieldError>{errorFor(`${fieldPrefix}.confirmPassword`)}</FieldError>
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
        <Field
          orientation="vertical"
          variant="outlined"
          data-invalid={isInvalid(`${fieldPrefix}.birthDate`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="birth-date">Fecha de nacimiento</FieldLabel>
          <DatePicker
            id="birth-date"
            mode="date"
            size="sm"
            value={parseDateValue(person.birthDate)}
            aria-invalid={isInvalid(`${fieldPrefix}.birthDate`)}
            onChange={(date) =>
              emitChange({ birthDate: date ? format(date, DATE_VALUE_FORMAT) : "" })
            }
          />
          <FieldError>{errorFor(`${fieldPrefix}.birthDate`)}</FieldError>
        </Field>
        <Field
          orientation="vertical"
          variant="outlined"
          data-invalid={isInvalid(`${fieldPrefix}.gender`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="gender-user">Género*</FieldLabel>
          <ComboboxField
            id="gender-user"
            items={genderLabels}
            aria-invalid={isInvalid(`${fieldPrefix}.gender`)}
            value={person.gender?.id ?? null}
            onValueChange={(selectedValue) => {
              const option = genders.find((item) => item.id === selectedValue)
              if (option) emitChange({ gender: option })
            }}
          >
            <ComboboxFieldTrigger size="sm" aria-invalid={isInvalid(`${fieldPrefix}.gender`)}>
              <ComboboxFieldValue placeholder="Seleccionar" />
            </ComboboxFieldTrigger>
            <ComboboxFieldContent>
              {genders.map((item) => (
                <ComboboxFieldItem key={item.id} value={item.id}>
                  {item.name}
                </ComboboxFieldItem>
              ))}
            </ComboboxFieldContent>
          </ComboboxField>
          <FieldError>{errorFor(`${fieldPrefix}.gender`)}</FieldError>
        </Field>
        <Field
          orientation="vertical"
          variant="outlined"
          className="w-full"
          data-invalid={isInvalid(`${fieldPrefix}.phone`) ? "true" : undefined}
        >
          <FieldLabel htmlFor="user-phone">Teléfono</FieldLabel>
          <Input
            id="user-phone"
            size="sm"
            placeholder="Agregar"
            type="tel"
            // TUSUARIO.TELEFONO / RegisterUsuarioRequest.telefono
            // son VARCHAR(30)/@Size(max=30) — sin restringir a
            // solo dígitos (a diferencia de NIT/DANE), un
            // teléfono legítimamente puede traer "+", espacios o
            // una extensión.
            maxLength={30}
            value={person.phone}
            aria-invalid={isInvalid(`${fieldPrefix}.phone`)}
            onChange={(event) => emitChange({ phone: event.target.value })}
          />
        </Field>
      </div>
      {!passwordsMatch && person.password.length > 0 && confirmPassword.length > 0 ? (
        <p className="text-sm text-destructive">Las contraseñas no coinciden.</p>
      ) : null}
    </div>
  )
}
