import { z } from "zod"

import { passwordRules } from "@/features/auth/api/schema"
import { optionalImageFile } from "@/lib/image-file"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import type { Person } from "@/features/establishment/employees/api/types/person"

export interface EstablishmentFormValidationResult {
  /** Etiquetas de los campos que fallaron, en el orden en que se validan. */
  errors: string[]
  /** Rutas de los campos que fallaron (`basicInfo.name`, `principal.password`, …). */
  invalidFields: string[]
  /**
   * Mensaje a mostrar debajo de cada campo, indexado por su ruta. Es lo que
   * consumen los formularios; `errors` e `invalidFields` se derivan de acá.
   */
  fieldErrors: Record<string, string>
}

/**
 * Confirmaciones de contraseña que el formulario mantiene como estado de UI,
 * indexadas por el `fieldPrefix` de cada persona validada.
 */
export interface EstablishmentFormConfirmPasswords {
  [fieldPrefix: string]: string
}

/** Texto obligatorio: se ignora el relleno de espacios. */
function requiredText(message: string) {
  return z
    .string()
    .transform((value) => value?.trim() ?? "")
    .refine((value) => value !== "", { message })
}

/**
 * Ítem de catálogo obligatorio. El `select` guarda el objeto completo, así
 * que lo que se exige es que tenga `id` — no `name`: en real, lo que carga
 * el detalle (`use-establishment.ts`) trae el `id` resuelto pero el `name`
 * queda vacío a propósito (la query no hace join contra el catálogo; el
 * `<Select>` resuelve la etiqueta visible contra el catálogo ya cargado,
 * por `id`, no leyendo `.name` del objeto). Validar por `.name` marcaba
 * como "vacío" un campo que en pantalla se veía bien seleccionado. El issue
 * queda en la ruta del ítem (`basicInfo.ownershipType`) y no en
 * `…ownershipType.name`, que es la ruta que el formulario usa para marcar
 * el campo.
 */
function requiredCatalogItem(message: string) {
  return z
    .object({ id: z.number().nullish() })
    .nullish()
    .refine((item) => item?.id != null, { message })
}

const establishmentSchema = z.object({
  basicInfo: z.object({
    name: requiredText("Ingresa el nombre del establecimiento."),
    dane: requiredText("Ingresa el código DANE."),
    nit: requiredText("Ingresa el NIT."),
    ownershipType: requiredCatalogItem("Selecciona la propiedad jurídica."),
  }),
  address: z.object({
    municipality: requiredCatalogItem("Selecciona el municipio."),
  }),
})

/**
 * Archivos del formulario. No viven en `EstablishmentDetails` —son estado
 * aparte de la página, porque viajan como binarios del multipart y no como
 * JSON—, así que se validan por separado pero con el mismo `collect`: para
 * quien consume el resultado son campos como cualquier otro, con su ruta y
 * su mensaje.
 */
export interface EstablishmentFormFiles {
  /** Escudo elegido en el dropzone. `null` = ninguno (o, editando, conservar el actual). */
  logo?: File | null
  /** Foto elegida, por `fieldPrefix` de persona (`principal`, `secretary`). */
  photos?: Record<string, File | null>
}

/** Etiqueta para el resumen, por ruta de campo del establecimiento. */
const ESTABLISHMENT_LABELS: Record<string, string> = {
  "basicInfo.name": "Nombre del establecimiento",
  "basicInfo.dane": "Código DANE",
  "basicInfo.nit": "NIT",
  "basicInfo.ownershipType": "Propiedad jurídica",
  "address.municipality": "Municipio",
}

/**
 * Etiqueta para el resumen, por campo de persona (se prefija con el rol).
 * Fecha de nacimiento sigue sin validarse acá (columna nullable de verdad,
 * ni la base ni Java la exigen). Género SÍ vuelve a ser obligatorio al
 * crear (REV: se había sacado, el negocio cambió de opinión) — coincide
 * con que ni `fn_usu_crear` ni `RegisterUsuarioRequest` (Java) dejaron de
 * exigirlo nunca en el backend, así que esto solo estaba desalineado del
 * lado del front.
 */
const PERSON_LABELS: Record<string, string> = {
  documentType: "tipo de documento",
  identification: "número de documento",
  firstName: "primer nombre",
  lastName: "primer apellido",
  email: "correo electrónico",
  gender: "género",
  password: "contraseña",
  confirmPassword: "confirmación de contraseña",
}

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === ""
}

/**
 * Una `Person` se considera "vacía" cuando los 4 campos mínimos están vacíos.
 * En ese caso no se exige nada (la persona puede no existir).
 */
function isPersonEmpty(person: Person | null): boolean {
  if (!person) {
    return true
  }

  return (
    isBlank(person.documentType?.name) &&
    isBlank(person.identification) &&
    isBlank(person.firstName) &&
    isBlank(person.lastName)
  )
}

/**
 * Persona con reglas condicionales, por eso va en un `superRefine` y no en un
 * `object` plano. `required` decide si la persona puede estar completamente
 * vacía (secretaria: puede no existir) o no (rector: obligatorio, sus 4
 * mínimos se exigen aunque el usuario no haya tocado nada).
 */
function makePersonSchema(required: boolean) {
  return z
    .object({
      person: z.custom<Person | null>(),
      confirmPassword: z.string(),
    })
    .superRefine(({ person, confirmPassword }, ctx) => {
      if (!required && (!person || isPersonEmpty(person))) {
        return
      }

      // Rector obligatorio pero sin persona todavía (o vacía del todo):
      // se valida contra un objeto en blanco para que salgan los 4
      // mensajes de "obligatorio", en vez de no marcar nada.
      const p: Person = person ?? {
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

      const require = (path: string, value: string | null | undefined, message: string) => {
        if (isBlank(value)) {
          ctx.addIssue({ code: "custom", path: [path], message })
        }
      }

      const requirePasswordStrength = (value: string | null | undefined) => {
        if (isBlank(value)) {
          return
        }

        for (const rule of passwordRules) {
          if (!rule.test(value as string)) {
            ctx.addIssue({ code: "custom", path: ["password"], message: rule.message })
          }
        }
      }

      require("documentType", p.documentType?.name, "Selecciona el tipo de documento.")
      require("identification", p.identification, "Ingresa el número de documento.")
      require("firstName", p.firstName, "Ingresa el primer nombre.")
      require("lastName", p.lastName, "Ingresa el primer apellido.")

      /**
       * Persona SIN `id` todavía (nunca tuvo rector/secretaria enlazado, o
       * el GET no trajo uno): al guardar va a `POST /register/funcionario`
       * (`RegisterUsuarioRequest`, auth-center), que exige `@NotBlank` en
       * `email` y `password` — son la cuenta y el login del funcionario,
       * no hay forma de omitirlos (a diferencia de fecha de nacimiento,
       * que sí es opcional de verdad). Persona CON `id` (ya existente) va
       * a PATCH `fn_fun_actualizar`, que tolera estos campos vacíos
       * (COALESCE, nunca resetea la contraseña) — por eso solo se exigen
       * acá cuando todavía no existe.
       *
       * `accountExists` (autocompletado por documento, ver
       * `use-user-by-document.ts`/`UserDetailsForm`): la persona no tiene
       * `id` (no hay un `TFUNCIONARIO` conocido para ESTE establecimiento
       * todavía), pero SÍ tiene una cuenta real — el backend la reconoce y
       * reutiliza por documento/correo (`FuncionarioRegistrationService`,
       * V71) sin tocarle la contraseña, así que acá tampoco hace falta
       * pedirla (el campo queda bloqueado en el form, ver
       * `UserDetailsForm`).
       */
      if (!p.id) {
        require("email", p.email, "Ingresa el correo electrónico.")
        require("gender", p.gender?.name, "Selecciona el género.")

        if (!p.accountExists) {
          require("password", p.password, "Ingresa la contraseña.")
          require("confirmPassword", confirmPassword, "Repite la contraseña.")
          requirePasswordStrength(p.password)

          if (!isBlank(p.password) && !isBlank(confirmPassword) && p.password !== confirmPassword) {
            ctx.addIssue({
              code: "custom",
              path: ["confirmPassword"],
              message: "Las contraseñas no coinciden.",
            })
          }
        }
        return
      }

      if (p.accountExists) {
        return
      }

      if (p.accountExists) {
        return
      }

      // Contraseña: sólo se valida si escribió algo (en cualquiera de los dos campos).
      const hasPassword = !isBlank(p.password)
      const hasConfirm = !isBlank(confirmPassword)

      if (!hasPassword && !hasConfirm) {
        return
      }

      require("password", p.password, "Ingresa la contraseña.")
      require("confirmPassword", confirmPassword, "Repite la contraseña.")
      requirePasswordStrength(p.password)

      if (hasPassword && hasConfirm && p.password !== confirmPassword) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmPassword"],
          message: "Las contraseñas no coinciden.",
        })
      }
    })
}

export function validateEstablishmentForm(
  values: EstablishmentDetails,
  confirmPasswords: EstablishmentFormConfirmPasswords = {},
  files: EstablishmentFormFiles = {},
): EstablishmentFormValidationResult {
  const errors: string[] = []
  const fieldErrors: Record<string, string> = {}

  // Primer mensaje por campo: el resto se descarta porque debajo del input solo
  // cabe una línea, y la primera regla que falla es la más específica.
  const collect = (path: string, message: string, label: string) => {
    if (fieldErrors[path] != null) {
      return
    }

    fieldErrors[path] = message
    errors.push(label)
  }

  const establishment = establishmentSchema.safeParse(values)
  if (!establishment.success) {
    // Se recorren las rutas conocidas y no `error.issues` para que el resumen
    // conserve el orden del formulario, sin depender del de Zod.
    for (const [path, label] of Object.entries(ESTABLISHMENT_LABELS)) {
      const issue = establishment.error.issues.find((item) => item.path.join(".") === path)
      if (issue) {
        collect(path, issue.message, label)
      }
    }
  }

  // El escudo se valida acá y no solo en el dropzone: es lo último antes de
  // armar el multipart, y es el único punto por el que pasan TODOS los
  // caminos que pueden dejar un `File` en el estado.
  const logo = optionalImageFile.safeParse(files.logo)
  if (!logo.success) {
    collect(
      "basicInfo.logo",
      logo.error.issues[0]?.message ?? "Archivo no válido.",
      "Escudo del establecimiento",
    )
  }

  for (const [fieldPrefix, label, required] of [
    ["principal", "Rector", true],
    ["secretary", "Secretaria", false],
  ] as const) {
    const person = values[fieldPrefix]

    const photo = optionalImageFile.safeParse(files.photos?.[fieldPrefix])
    if (!photo.success) {
      collect(
        `${fieldPrefix}.photo`,
        photo.error.issues[0]?.message ?? "Archivo no válido.",
        `${label}: Foto`,
      )
    }

    const result = makePersonSchema(required).safeParse({
      person,
      confirmPassword: confirmPasswords[fieldPrefix] ?? "",
    })

    if (result.success) {
      continue
    }

    for (const [field, fieldLabel] of Object.entries(PERSON_LABELS)) {
      const issue = result.error.issues.find((item) => item.path.join(".") === field)
      if (issue) {
        collect(`${fieldPrefix}.${field}`, issue.message, `${label}: ${fieldLabel}`)
      }
    }

    // "No coinciden" reemplaza al mensaje de campo vacío cuando ambos tienen
    // contenido, así que se busca aparte para que el resumen lo refleje.
    const mismatch = result.error.issues.find(
      (item) => item.path.join(".") === "confirmPassword" && item.message.includes("no coinciden"),
    )
    if (mismatch && !errors.includes(`${label}: las contraseñas no coinciden`)) {
      fieldErrors[`${fieldPrefix}.confirmPassword`] = mismatch.message
      errors.push(`${label}: las contraseñas no coinciden`)
    }
  }

  return {
    errors,
    invalidFields: Object.keys(fieldErrors),
    fieldErrors,
  }
}
