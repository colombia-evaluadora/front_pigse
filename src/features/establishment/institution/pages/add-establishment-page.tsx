import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState, type FormEvent } from "react"

import { Card, CardContent } from "@/components/ui/card"
import {
  TableScreen,
  TableScreenBody,
  TableScreenFooter,
  TableScreenHeader,
  TableScreenTitle,
} from "@/components/layout/table-screen"
import { Button } from "@/components/ui/button"
import { CheckIcon } from "@/components/ui/icons"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/overlay/accordion"

import { paths } from "@/config/paths"
import { env } from "@/config/env"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { EstablishmentDetailsForm } from "@/features/establishment/institution/components/forms/form-establishment"
import { ComplementaryDataFormSection } from "@/features/establishment/institution/components/forms/form-sections/complementary-data-section"
import { useCreateWithPerson } from "@/features/establishment/employees/api/mutations/use-create-with-person"
import {
  cancelarFuncionarioPendiente,
  registerFuncionario,
} from "@/features/establishment/employees/api/mutations/use-register-funcionario"
import { update as updateFuncionario } from "@/features/establishment/employees/api/mutations/update"
import { useCreate } from "@/features/establishment/institution/api/mutations/use-create"
import { useUpdate } from "@/features/establishment/institution/api/mutations/use-update"
import { useEstablishmentQuery } from "@/features/establishment/institution/api/query/use-establishment"
import type { EstablishmentDetails } from "@/features/establishment/institution/api/types/establishment"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import {
  personDataChangedSinceMatch,
  type Person,
} from "@/features/establishment/employees/api/types/person"
import { UserDetailsForm } from "@/features/establishment/employees/components/forms/form-sections/user-details-section"
import { validateEstablishmentForm } from "@/features/establishment/institution/utils/validate-form"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"

/**
 * Solo para los acordeones de esta página: título más grande y el caret
 * (botón de abrir/cerrar) a la izquierda, antes del título. `flex-row-reverse`
 * + `justify-end` invierte el orden visual sin tocar el componente compartido.
 */
const accordionTriggerClassName =
  "flex-row-reverse justify-end items-center gap-3 py-2.5 text-lg **:data-[slot=accordion-trigger-icon]:ml-0 **:data-[slot=accordion-trigger-icon]:size-5"

/**
 * Las cards dentro de los acordeones ya viven en un contenedor con su propio
 * aire, así que el `py` de 8 de la Card se sentía enorme: lo bajamos a 5 sin
 * tocar el padding horizontal.
 */
const accordionCardClassName = "py-5"

/**
 * Fallback defensivo para `persistPersonIfAny`: solo se usa si `person.id`
 * viene poblado (persona existente) pero `existingEmployee` es `null` — no
 * debería pasar en la práctica (si hay `id` es porque `fetchEstablishment`
 * lo hidrató desde `fn_usu_empleado_buscar_por_pk`), pero evita mandar
 * `undefined` en los campos de empleo si algún día no fuera así. Catálogos
 * en `null` + `status: "ACTIVE"` + `permissions: []` == "no cambiar nada de
 * esto" según el COALESCE de `fn_fun_actualizar` (ver `update.ts`).
 */
function createEmptyEmployeeShell(): Omit<Employee, "person"> {
  return {
    employeeClass: null,
    educationLevel: null,
    grade: null,
    highestEducationLevel: null,
    fundingSource: null,
    functionalPosition: null,
    employmentType: null,
    address: "",
    permissions: [],
    status: "ACTIVE",
  }
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

// Sin `id`: lo asigna el backend al crear (POST /establishments). El
// formulario de alta arranca sin ninguno, no con uno inventado en el cliente.
function createInitialEstablishmentValues(): EstablishmentDetails {
  return {
    basicInfo: {
      name: "",
      dane: "",
      nit: "",
      ownershipType: null,
    },
    address: {
      municipality: null,
      zone: null,
      district: null,
      commune: null,
      locality: null,
      address: "",
    },
    contact: {
      email: "",
      website: "",
      phone: "",
      fax: "",
    },
    additionalInfo: {
      approvalResolution: "",
      teachingLanguage: null,
      calendar: null,
      costRegime: null,
      populationGender: null,
      tuitionRange: null,
      disabilityType: null,
      operatingLicense: false,
      licenseStatus: "",
      licenseDate: null,
      ethnicAttention: false,
      giftedAttention: false,
      subsidy: false,
    },
    principal: createEmptyPerson(),
    secretary: createEmptyPerson(),
  }
}

export function AddEstablishmentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { notify } = useNotify()
  const establishmentIdParam = location.pathname.includes("/editar/")
    ? (location.pathname.split("/editar/").at(1) ?? null)
    : null
  // El segmento de ruta siempre llega como string; el `id` real del dominio
  // es number, así que se convierte una sola vez acá.
  const establishmentId = establishmentIdParam !== null ? Number(establishmentIdParam) : null
  const isEditMode = establishmentId !== null && !Number.isNaN(establishmentId)
  const [formValues, setFormValues] = useState<EstablishmentDetails>(
    createInitialEstablishmentValues,
  )
  // Mensaje por campo, indexado por ruta (`basicInfo.name`, `principal.password`, …).
  // Escudo elegido en el dropzone. Vive acá y no en la sección del formulario
  // porque es esta página la que guarda: se manda como el archivo `logo` del
  // multipart, aparte del JSON. `null` = no se eligió ninguno, y en edición
  // eso significa conservar el que ya tiene.
  const [shield, setShield] = useState<File | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [invalidFields, setInvalidFields] = useState<string[]>([])
  const [hasSubmitted, setHasSubmitted] = useState(false)
  // Confirmaciones de contraseña: estado de UI, no parte del modelo de negocio.
  const [confirmPasswords, setConfirmPasswords] = useState<Record<string, string>>({
    principal: "",
    secretary: "",
  })
  // Mismo criterio que `shield`, pero por persona: la foto de rector y
  // secretaria se manda como `fkTarchivoFoto` del multipart de SU propio
  // registro/actualización de funcionario, no del establecimiento.
  const [photos, setPhotos] = useState<Record<string, File | null>>({
    principal: null,
    secretary: null,
  })
  // Registro completo de TFUNCIONARIO (no solo `Person`) para rector y
  // secretaria, cuando el EE ya tenía uno enlazado — se necesita al guardar
  // para reenviar sus campos de empleo (clase, jornada, estado, dirección)
  // tal cual vinieron, sin pisarlos con `null` (ver `persistPersonIfAny`).
  // `null` en mock, o si el EE nunca tuvo uno asignado.
  const [principalEmployee, setPrincipalEmployee] = useState<Employee | null>(null)
  const [secretaryEmployee, setSecretaryEmployee] = useState<Employee | null>(null)
  // Snapshot crudo que devolvió el autocompletado por documento (antes de
  // mezclar el placeholder de contraseña), por persona — `null` mientras no
  // hubo match o el documento cambió después de uno. Solo aplica al caso
  // "existe la cuenta pero todavía no hay TFUNCIONARIO" (`found.id`
  // ausente): si el usuario corrige algún dato del form antes de guardar,
  // `persistPersonIfAny` lo compara contra este snapshot para saber si hay
  // que encadenar un PATCH además de `registerFuncionario` (ver
  // `personDataChangedSinceMatch`). Cuando el match SÍ trae `id` (ya es
  // funcionario activo), `persistPersonIfAny` ya toma la rama de edición
  // normal por `person.id` y este snapshot no hace falta.
  const principalMatchRef = useRef<Partial<Person> | null>(null)
  const secretaryMatchRef = useRef<Partial<Person> | null>(null)

  const establishmentQuery = useEstablishmentQuery(establishmentId, isEditMode)

  useEffect(() => {
    if (!isEditMode) {
      setFormValues(createInitialEstablishmentValues())
      setFieldErrors({})
      setInvalidFields([])
      setHasSubmitted(false)
      setConfirmPasswords({ principal: "", secretary: "" })
      setPrincipalEmployee(null)
      setSecretaryEmployee(null)
      principalMatchRef.current = null
      secretaryMatchRef.current = null
      return
    }

    if (establishmentQuery.data?.status === "ok") {
      const existing = establishmentQuery.data.establishment
      setFormValues(existing)
      setFieldErrors({})
      setInvalidFields([])
      setHasSubmitted(false)
      setConfirmPasswords({
        principal: existing.principal?.password ?? "",
        secretary: existing.secretary?.password ?? "",
      })
      setPrincipalEmployee(establishmentQuery.data.principalEmployee)
      setSecretaryEmployee(establishmentQuery.data.secretaryEmployee)
      principalMatchRef.current = null
      secretaryMatchRef.current = null
    }
  }, [establishmentQuery.data, isEditMode])

  useEffect(() => {
    if (!hasSubmitted) return
    const validation = validateEstablishmentForm(formValues, confirmPasswords, {
      logo: shield,
      photos,
    })
    setFieldErrors(validation.fieldErrors)
    setInvalidFields(validation.invalidFields)
  }, [formValues, confirmPasswords, shield, photos, hasSubmitted])

  // Sin `onSuccess` acá: en real hay que enlazar rector/secretaria (si se
  // registraron de nuevo) DESPUÉS de crear el establecimiento y ANTES de
  // navegar — `handleSubmit` orquesta todo eso a mano tras `mutateAsync`.
  const createMutation = useCreate({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error) || "No se pudo crear el establecimiento.", {
          variant: "error",
        })
      },
    },
  })

  const updateMutation = useUpdate({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify(SUCCESS_MESSAGES.establishment.updated)
        navigate({ to: paths.app.establishments.general.getHref() })
      },
      onError: (error) => {
        notify(getErrorMessage(error) || "No se pudo actualizar el establecimiento.", {
          variant: "error",
        })
      },
    },
  })

  const createPersonMutation = useCreateWithPerson()

  /**
   * Devuelve true si la persona ya trae al menos un dato capturado (la
   * consideramos "presente" y por tanto debe persistirse).
   */
  function personHasAnyData(person: Person | null, confirmPassword: string): boolean {
    if (!person) {
      return false
    }

    return Boolean(
      person.documentType?.id ||
      person.identification.trim() ||
      person.firstName.trim() ||
      person.lastName.trim() ||
      person.middleName?.trim() ||
      person.secondLastName?.trim() ||
      person.birthDate.trim() ||
      person.gender?.id ||
      person.email.trim() ||
      person.phone.trim() ||
      person.password.trim() ||
      confirmPassword.trim(),
    )
  }

  interface PersistedPerson {
    person: Person
    /**
     * PK_TFUNCIONARIO del funcionario recién REGISTRADO en este submit —
     * solo cuando de verdad se llamó a `/register/funcionario` acá (persona
     * sin `id` previo, ver más abajo). Es el candidato a rollback si el paso
     * siguiente (crear/actualizar el establecimiento) falla —
     * `cancelarPendientesRegistrados`, en `handleSubmit`. `null` en mock, y
     * también `null` cuando la persona ya existía y solo se actualizó
     * (`updateFuncionario`) — ya está en uso, cancelarla sería un error.
     */
    pkFuncionarioRegistrado: number | null
  }

  /**
   * Persiste rector/secretaria. En alta, se llama ANTES de crear el
   * establecimiento (hace falta su id para `p_fk_tfuncionario_rector`/
   * `secretaria`); en edición, el EE ya existe así que el orden no importa.
   *
   * - Mock: POST /person (como siempre) — `upsertPerson` ya distingue alta
   *   de actualización por la presencia de `person.id`.
   * - Real, persona EXISTENTE (`person.id` presente — vino del GET al editar
   *   un EE, o del autocompletado por documento cuando la persona YA es
   *   funcionario activo en otro lado, ver `findPersonByDocument`/V51 REV5):
   *   PATCH `/establecimientos/funcionarios/:id` (`fn_fun_actualizar`) —
   *   TFUNCIONARIO es una sola fila por persona (ya no una por
   *   establecimiento), así que "ya existe" siempre significa "editar ese
   *   mismo registro", sea cual sea el establecimiento donde se lo esté
   *   asignando ahora. Se reenvía el resto del `Employee`
   *   (`existingEmployee`) tal cual vino, para no pisar clase/jornada/
   *   estado/dirección con `null` — el form de establecimiento solo edita
   *   los campos de `Person`. `existingEmployee` es `null` cuando el `id`
   *   vino del autocompletado (nunca se cargó un `Employee` completo para
   *   esa persona en esta pantalla): se usa `createEmptyEmployeeShell()`,
   *   cuyos catálogos en `null` el COALESCE de `fn_fun_actualizar` traduce
   *   como "no cambiar nada de esto".
   * - Real, persona NUEVA (`person.id` ausente): POST /register/funcionario
   *   (auth-center, Java) — crea TUSUARIO + TFUNCIONARIO (`fn_fun_crear`
   *   reusa el TUSUARIO si `accountExists` era `true`, o crea uno nuevo si
   *   no). El vínculo con el EE lo pone `fn_est_crear`/`fn_est_actualizar`
   *   directo vía `FK_TFUNCIONARIO_RECTOR`/`SECRETARIA` (se le manda el
   *   `pkFuncionario` en el mismo POST/PATCH del establecimiento) — ya NO
   *   hace falta un paso de "enlazar" aparte.
   *
   *   `matchSnapshot` (solo aplica a esta rama, cuando `accountExists` era
   *   `true`): lo que trajo el autocompletado ANTES de que el usuario
   *   editara algo. `fn_fun_crear` reusa el TUSUARIO tal cual estaba —
   *   si el usuario corrigió un dato en el form (p. ej. el teléfono) antes
   *   de guardar, esa corrección se pierde a menos que se encadene un PATCH
   *   aparte con el `pkFuncionario` recién creado (`personDataChangedSinceMatch`).
   */
  async function persistPersonIfAny(
    person: Person | null,
    existingEmployee: Employee | null,
    label: string,
    confirmPassword: string,
    /** Foto recién elegida; `null` en edición = conservar la guardada. */
    foto: File | null,
    /** Ver el párrafo de `matchSnapshot` arriba. `null` si no hubo match, o
     * si el match ya traía `id` (esa rama no la necesita). */
    matchSnapshot: Partial<Person> | null,
  ): Promise<PersistedPerson | null> {
    if (!person || !personHasAnyData(person, confirmPassword)) {
      return null
    }

    if (!env.ENABLE_API_MOCKING) {
      try {
        if (person.id) {
          // `fn_fun_actualizar` (id_query=119) solo devuelve el PK
          // actualizado (`{rows:[{pk_funcionario_actualizado}]}`), no un
          // `Employee` completo — a diferencia del tipo de retorno de
          // `update()` (pensado para el mock, que sí devuelve `{status,
          // message, employee}`). El módulo de funcionarios ya convive con
          // esto (su propio `onSuccess` nunca lee `.employee`, ver
          // `dialog-manage.tsx`); acá tampoco hay que leerlo del response —
          // ya tenemos el `person` que se acaba de mandar, se devuelve tal
          // cual.
          await updateFuncionario(
            person.id,
            {
              ...(existingEmployee ?? createEmptyEmployeeShell()),
              person,
            },
            foto,
          )
          notify(`${label} actualizado.`)
          return { person, pkFuncionarioRegistrado: null }
        }

        const registered = await registerFuncionario(person, foto)
        const persistedPerson = { ...person, id: registered.pkFuncionario }

        // Ver "matchSnapshot" en el comentario de arriba: `fn_fun_crear`
        // reusó el TUSUARIO tal cual estaba, así que cualquier corrección
        // que el usuario haya hecho en el form todavía no llegó al backend.
        if (matchSnapshot && personDataChangedSinceMatch(matchSnapshot, person)) {
          await updateFuncionario(
            registered.pkFuncionario,
            { ...createEmptyEmployeeShell(), person: persistedPerson },
            foto,
          )
        }

        notify(`${label} guardado.`)
        return {
          person: persistedPerson,
          pkFuncionarioRegistrado: registered.pkFuncionario,
        }
      } catch (error) {
        notify(error instanceof Error ? error.message : `No fue posible guardar el ${label}.`, {
          variant: "error",
        })
        throw new Error(`person_persist_failed:${label}`)
      }
    }

    const result = await createPersonMutation.mutateAsync(person)

    if (result.status === "error") {
      notify(result.message || `No fue posible guardar el ${label}.`, { variant: "error" })
      throw new Error(`person_persist_failed:${label}`)
    }

    notify(`${label} guardado.`)
    return { person: result.person, pkFuncionarioRegistrado: null }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setHasSubmitted(true)

    const validation = validateEstablishmentForm(formValues, confirmPasswords, {
      logo: shield,
      photos,
    })
    setFieldErrors(validation.fieldErrors)
    setInvalidFields(validation.invalidFields)

    if (validation.errors.length > 0) {
      notify("Completa los campos obligatorios antes de guardar.", { variant: "error" })
      return
    }

    // Persistimos rector/secretaria antes del establecimiento para que
    // los `Person` queden con `id` en `personsDb` (mock) o con el
    // `pkFuncionario` que devolvió /register/funcionario (real, solo si
    // eran nuevos — si ya existían, `persistPersonIfAny` los actualiza en
    // el mismo paso y no hay nada que enlazar después).
    let nextPrincipal = formValues.principal
    let nextSecretary = formValues.secretary
    let principalPkFuncionario: number | null = null
    let secretaryPkFuncionario: number | null = null

    try {
      const persistedPrincipal = await persistPersonIfAny(
        nextPrincipal,
        principalEmployee,
        "Rector",
        confirmPasswords["principal"] ?? "",
        photos["principal"] ?? null,
        principalMatchRef.current,
      )
      if (persistedPrincipal) {
        nextPrincipal = persistedPrincipal.person
        principalPkFuncionario = persistedPrincipal.pkFuncionarioRegistrado
      }

      const persistedSecretary = await persistPersonIfAny(
        nextSecretary,
        secretaryEmployee,
        "Secretaria",
        confirmPasswords["secretary"] ?? "",
        photos["secretary"] ?? null,
        secretaryMatchRef.current,
      )
      if (persistedSecretary) {
        nextSecretary = persistedSecretary.person
        secretaryPkFuncionario = persistedSecretary.pkFuncionarioRegistrado
      }
    } catch {
      return
    }

    const nextValues: EstablishmentDetails = {
      ...formValues,
      principal: nextPrincipal,
      secretary: nextSecretary,
    }

    /**
     * Rollback: deshace cualquier rector/secretaria REGISTRADO de cero en
     * este submit (`pkFuncionarioRegistrado` no nulo) cuando crear/
     * actualizar el establecimiento falla — sin esto, ese `TFUNCIONARIO`
     * quedaba huérfano (no referenciado por ningún establecimiento) sin
     * ninguna forma de deshacerlo desde el front. Confirmado con datos
     * reales: un funcionario de prueba con 3 `TFUNCIONARIO`, uno de ellos
     * sin ningún establecimiento que lo referenciara — la creación del EE
     * había fallado DESPUÉS de que `registerFuncionario` ya lo hubiera
     * creado (ver `fn_fun_cancelar_pendiente`, V51 REV5).
     *
     * Ya no hay un paso de "enlazar" aparte que distinguir (rector/
     * secretaria se referencian directo vía `FK_TFUNCIONARIO_RECTOR`/
     * `SECRETARIA` dentro del propio POST/PATCH del establecimiento, ver
     * `persistPersonIfAny`) — si `createMutation`/`updateMutation` fallan,
     * la transacción de `fn_est_crear`/`fn_est_actualizar` se abortó
     * entera, así que el `TFUNCIONARIO` nunca llegó a quedar referenciado
     * y es siempre seguro cancelarlo.
     */
    async function cancelarPendientesRegistrados() {
      const pendientes = [principalPkFuncionario, secretaryPkFuncionario].filter(
        (pk): pk is number => pk !== null,
      )
      if (pendientes.length === 0) return

      const results = await Promise.allSettled(
        pendientes.map((pk) => cancelarFuncionarioPendiente(pk)),
      )
      const fallaronTodas = results.every((r) => r.status === "rejected")
      notify(
        fallaronTodas
          ? "Además, no fue posible deshacer el registro de rector/secretaria — puede haber quedado un registro a medias, contacta soporte."
          : "El registro de rector/secretaria de este intento se deshizo — puedes volver a intentarlo.",
        { variant: "error" },
      )
    }

    if (isEditMode && establishmentId) {
      try {
        const result = await updateMutation.mutateAsync({
          establishmentId,
          values: { ...nextValues, id: establishmentId },
          logo: shield,
        })
        if (result.status === "error") {
          await cancelarPendientesRegistrados()
        }
      } catch {
        await cancelarPendientesRegistrados()
      }
      return
    }

    let result: Awaited<ReturnType<typeof createMutation.mutateAsync>>
    try {
      result = await createMutation.mutateAsync({ values: nextValues, logo: shield })
    } catch {
      // El establecimiento nunca llegó a crearse — safe cancelar. El
      // `onError` de `createMutation` ya avisó el motivo puntual del
      // fallo (NIT duplicado, etc.); acá solo se agrega el aviso del
      // rollback.
      await cancelarPendientesRegistrados()
      return
    }

    if (result.status === "error") {
      notify(result.message, { variant: "error" })
      await cancelarPendientesRegistrados()
      return
    }

    notify(SUCCESS_MESSAGES.establishment.created)
    navigate({ to: paths.app.establishments.general.getHref() })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    /*
      El mismo andamiaje que las pantallas de listado: encabezado pegajoso,
      cuerpo que se estira hasta el borde inferior y —lo propio de un
      formulario— la barra de guardar pegada abajo.
    */
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle
          action={
            <Button
              render={<Link to={paths.app.establishments.general.getHref()} />}
              variant="fill"
              color="neutral"
              size="sm"
              nativeButton={false}
            >
              Cerrar
            </Button>
          }
        >
          {isEditMode ? "Editar establecimiento educativo" : "Agregar establecimiento educativo"}
        </TableScreenTitle>
        <NoticeOutlet className="mx-(--screen-spacing) my-4" />
      </TableScreenHeader>

      {/* Sin radio ni borde abajo: ahí se acopla la barra de acciones, que trae
          el suyo — si no, quedan dos líneas de 1px juntas. */}
      <TableScreenBody className="rounded-b-none border-b-0">
        {/* Sin resumen de errores arriba: cada mensaje vive debajo de su campo
            (`fieldErrors`), que es donde el usuario tiene que actuar. Del aviso
            general se encarga el `notify` del submit. */}
        <form id="create-establishment-form" onSubmit={handleSubmit}>
          <Accordion
            multiple
            defaultValue={["datos-establecimiento", "datos-rector-secretaria"]}
            keepMounted
            className="space-y-3"
          >
            <AccordionItem
              value="datos-establecimiento"
              className="rounded-md border border-border not-last:border-b border"
            >
              <AccordionTrigger className={accordionTriggerClassName}>
                Datos de establecimiento
              </AccordionTrigger>
              <AccordionContent>
                {/* Dos cards, igual que rector y secretaria: identificación,
                    domicilio y contacto describen al establecimiento y van
                    juntos; la información complementaria es un bloque aparte. */}
                <div className="space-y-4">
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <EstablishmentDetailsForm
                        value={formValues}
                        onChange={setFormValues}
                        invalidFields={invalidFields}
                        errors={fieldErrors}
                        showValidation={hasSubmitted}
                        shield={shield}
                        onShieldChange={setShield}
                      />
                    </CardContent>
                  </Card>
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <ComplementaryDataFormSection
                        value={formValues.additionalInfo}
                        onChange={(additionalInfo) =>
                          setFormValues((current) => ({ ...current, additionalInfo }))
                        }
                        invalidFields={invalidFields}
                        errors={fieldErrors}
                        showValidation={hasSubmitted}
                      />
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="datos-rector-secretaria"
              className="rounded-md border border-border not-last:border-b border"
            >
              <AccordionTrigger className={accordionTriggerClassName}>
                Datos de rector y secretaria
              </AccordionTrigger>
              <AccordionContent>
                {/* Una card por persona: rector y secretaria son bloques
                    independientes, no un solo formulario partido en dos. */}
                <div className="space-y-4">
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <UserDetailsForm
                        role="RECTOR"
                        fieldPrefix="principal"
                        value={formValues.principal}
                        onChange={(principal) =>
                          setFormValues((current) => ({ ...current, principal }))
                        }
                        invalidFields={invalidFields}
                        errors={fieldErrors}
                        showValidation={hasSubmitted}
                        confirmPassword={confirmPasswords["principal"] ?? ""}
                        onConfirmPasswordChange={(value) =>
                          setConfirmPasswords((current) => ({ ...current, principal: value }))
                        }
                        photo={photos["principal"] ?? null}
                        onPhotoChange={(file) =>
                          setPhotos((current) => ({ ...current, principal: file }))
                        }
                        onMatched={(found) => {
                          // Solo hace falta guardar el snapshot cuando el
                          // match NO trae `id` (ver `persistPersonIfAny`):
                          // si ya trae `id`, esa rama edita directo por PK
                          // y no compara contra nada.
                          principalMatchRef.current = found && !found.id ? found : null
                        }}
                      />
                    </CardContent>
                  </Card>
                  <Card className={accordionCardClassName}>
                    <CardContent>
                      <UserDetailsForm
                        role="SECRETARY"
                        fieldPrefix="secretary"
                        value={formValues.secretary}
                        onChange={(secretary) =>
                          setFormValues((current) => ({ ...current, secretary }))
                        }
                        invalidFields={invalidFields}
                        errors={fieldErrors}
                        showValidation={hasSubmitted}
                        required={false}
                        confirmPassword={confirmPasswords["secretary"] ?? ""}
                        onConfirmPasswordChange={(value) =>
                          setConfirmPasswords((current) => ({ ...current, secretary: value }))
                        }
                        photo={photos["secretary"] ?? null}
                        onPhotoChange={(file) =>
                          setPhotos((current) => ({ ...current, secretary: file }))
                        }
                        onMatched={(found) => {
                          secretaryMatchRef.current = found && !found.id ? found : null
                        }}
                      />
                    </CardContent>
                  </Card>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </form>
      </TableScreenBody>

      <TableScreenFooter>
        <p className="text-sm text-muted-foreground">Complete la información antes de guardar.</p>
        <Button
          type="submit"
          form="create-establishment-form"
          variant="fill"
          color="primary"
          size="sm"
          disabled={isPending}
        >
          <CheckIcon />
          {isPending ? "Guardando..." : "Guardar"}
        </Button>
      </TableScreenFooter>
    </TableScreen>
  )
}
