import type { CatalogItem } from "@/types/catalog"

export interface Person {
  /** Ausente hasta que el backend lo asigna (POST /person). */
  id?: number

  /**
   * Catálogo referencial. Es `null` mientras la persona está sin asignar
   * (formularios vacíos, filtros sin selección) en lugar de un
   * `CatalogItem` con campos vacíos — el modelo distingue "elegí nada"
   * de "elegí algo que ahora no tengo".
   */
  documentType: CatalogItem | null

  identification: string

  firstName: string

  middleName?: string

  lastName: string

  secondLastName?: string

  birthDate: string

  gender: CatalogItem | null

  email: string

  phone: string

  password: string

  /**
   * `pk_tarchivo` de la foto de perfil ya guardada — `undefined`/`null` si
   * nunca se subió una. Solo de lectura (la llena el GET); nunca viaja de
   * vuelta al backend en un create/update, igual que `logoArchivoId` en
   * `EstablishmentDetails.basicInfo` — la foto NUEVA a subir es un `File`
   * aparte (`photo`/`onPhotoChange` en `UserDetailsForm`), no este campo.
   */
  photoArchivoId?: number | null

  /**
   * `true` cuando el autocompletado por documento (`findPersonByDocument`)
   * encontró un `TUSUARIO` ya existente con ese tipo+número de documento.
   * A propósito NO es lo mismo que `id`: `id` en este tipo representa el
   * `PK_TFUNCIONARIO` (para decidir crear vs. actualizar un funcionario
   * puntual), pero el autocompletado solo confirma que existe la CUENTA
   * (`TUSUARIO`) — no hay forma de saber, solo con el documento, cuál
   * `TFUNCIONARIO` (si alguno) le corresponde a este establecimiento en
   * particular. Se usa exclusivamente para bloquear/eximir el campo de
   * contraseña en el formulario (ver `UserDetailsForm`): al guardar, el
   * backend igual reconoce y reutiliza la cuenta por documento/correo, así
   * que no hace falta (ni tiene sentido) pedir una contraseña nueva.
   */
  accountExists?: boolean
}

/**
 * ¿Cambió algo de `current` respecto al `original` que trajo el
 * autocompletado por documento? Se usa en el alta (rector/secretaria en
 * `add-establishment-page.tsx`, funcionario regular en `dialog-manage.tsx`)
 * cuando `accountExists` era `true` pero la persona todavía no tenía
 * `TFUNCIONARIO`: `registerFuncionario` solo crea el `TFUNCIONARIO` (reusa
 * el `TUSUARIO` tal cual estaba, ver `fn_fun_crear`/V71) — si el usuario
 * corrigió algún dato de la persona en el form antes de guardar, esa
 * corrección nunca llega al backend a menos que se encadene un PATCH
 * (`update()`) aparte con el `pkFuncionario` recién creado.
 *
 * Solo compara los campos que vive en `TUSUARIO` y que el form deja
 * editar tras el autocompletado (documento/tipo son la clave del match,
 * no se comparan; `password` es decorativo mientras `accountExists`).
 */
export function personDataChangedSinceMatch(original: Partial<Person>, current: Person): boolean {
  const sameText = (a?: string | null, b?: string | null) => (a ?? "").trim() === (b ?? "").trim()

  return (
    !sameText(original.firstName, current.firstName) ||
    !sameText(original.middleName, current.middleName) ||
    !sameText(original.lastName, current.lastName) ||
    !sameText(original.secondLastName, current.secondLastName) ||
    !sameText(original.birthDate, current.birthDate) ||
    !sameText(original.phone, current.phone) ||
    !sameText(original.email, current.email) ||
    (original.gender?.id ?? null) !== (current.gender?.id ?? null)
  )
}
