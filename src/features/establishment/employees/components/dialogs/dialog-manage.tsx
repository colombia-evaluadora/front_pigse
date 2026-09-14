import { useEffect, useState } from "react"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { CheckIcon, XIcon } from "@/components/ui/icons"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { CATALOGS } from "@/lib/catalogs"
import { toSelectItemsMap, toSelectOptions } from "@/lib/catalog-options"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { env } from "@/config/env"

import { useCreate } from "@/features/establishment/employees/api/mutations/use-create"
import { useCreateWithPerson } from "@/features/establishment/employees/api/mutations/use-create-with-person"
import { update as updateFuncionario } from "@/features/establishment/employees/api/mutations/update"
import { useUpdate } from "@/features/establishment/employees/api/mutations/use-update"
import { registerFuncionario } from "@/features/establishment/employees/api/mutations/use-register-funcionario"
import { useAssignRole } from "@/features/establishment/employees/api/mutations/use-assign-role"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useEmployeeQuery } from "@/features/establishment/employees/api/query/use-employee"
import { useEmployeeRolesQuery } from "@/features/establishment/employees/api/query/use-employee-roles"
import { useEstablishmentsOptionsQuery } from "@/features/establishment/institution/api/query/use-establishments-options"
import type { CatalogItem } from "@/types/catalog"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { Person } from "@/features/establishment/employees/api/types/person"
import { passwordRules } from "@/features/auth/api/schema"
import { UserDetailsForm } from "@/features/establishment/employees/components/forms/form-sections/user-details-section"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"

interface ManageEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: number | null
}

function createEmptyPerson(): Person {
  return {
    documentType: null,
    identification: "",
    firstName: "",
    middleName: "",
    lastName: "",
    secondLastName: "",
    birthDate: "",
    gender: null,
    email: "",
    phone: "",
    password: "",
  }
}

function isBlankValue(value: string | null | undefined): boolean {
  return value == null || value.trim() === ""
}

/**
 * Datos mínimos para dar de alta a la persona: los cuatro con asterisco, más
 * correo, género y contraseña — no llevan asterisco en el formulario
 * (`UserDetailsForm` lo comparte con otras pantallas donde son opcionales),
 * pero acá son obligatorios de verdad: `/register/pigse/funcionario`
 * (`RegisterUsuarioRequest`, auth-center) y `pigse.fn_fun_crear` (SQL) los
 * exigen — correo/contraseña son la cuenta y el login del funcionario, y
 * género nunca dejó de ser obligatorio en el backend real. Fecha de
 * nacimiento sigue sin validarse acá: es columna nullable de verdad.
 *
 * `person.accountExists` (autocompletado por documento, ver
 * `use-user-by-document.ts`): ya hay una cuenta real detrás de ese
 * documento — el backend la reconoce y reutiliza sin tocarle la
 * contraseña (`FuncionarioRegistrationService`, V71), así que acá tampoco
 * se exige (el campo queda bloqueado en el form).
 */
const employeePersonSchema = z
  .object({
    person: z.custom<Person>(),
    confirmPassword: z.string(),
  })
  .superRefine(({ person, confirmPassword }, ctx) => {
    const require = (path: string, value: string | null | undefined, message: string) => {
      if (isBlankValue(value)) {
        ctx.addIssue({ code: "custom", path: [path], message })
      }
    }

    const requirePasswordStrength = (value: string | null | undefined) => {
      if (isBlankValue(value)) {
        return
      }

      for (const rule of passwordRules) {
        if (!rule.test(value as string)) {
          ctx.addIssue({ code: "custom", path: ["password"], message: rule.message })
        }
      }
    }

    if (!person.documentType?.id) {
      ctx.addIssue({
        code: "custom",
        path: ["documentType"],
        message: "Selecciona el tipo de documento.",
      })
    }
    require("identification", person.identification, "Ingresa el número de documento.")
    require("firstName", person.firstName, "Ingresa el primer nombre.")
    require("lastName", person.lastName, "Ingresa el primer apellido.")

    // Persona SIN `id` todavía: va a `POST /register/pigse/funcionario`, que
    // exige `@NotBlank` en email/password. Persona CON `id` va a PUT
    // (tolera estos campos vacíos, nunca resetea la contraseña), así que
    // acá solo se exigen al crear.
    if (!person.id) {
      require("email", person.email, "Ingresa el correo electrónico.")
      require("gender", person.gender?.name, "Selecciona el género.")

      if (!person.accountExists) {
        require("password", person.password, "Ingresa la contraseña.")
        require("confirmPassword", confirmPassword, "Repite la contraseña.")
        requirePasswordStrength(person.password)

        if (
          !isBlankValue(person.password) &&
          !isBlankValue(confirmPassword) &&
          person.password !== confirmPassword
        ) {
          ctx.addIssue({
            code: "custom",
            path: ["confirmPassword"],
            message: "Las contraseñas no coinciden.",
          })
        }
      }
      return
    }

    if (person.accountExists) {
      return
    }

    const hasPassword = !isBlankValue(person.password)
    const hasConfirm = !isBlankValue(confirmPassword)

    if (!hasPassword && !hasConfirm) {
      return
    }

    require("password", person.password, "Ingresa la contraseña.")
    require("confirmPassword", confirmPassword, "Repite la contraseña.")
    requirePasswordStrength(person.password)

    if (hasPassword && hasConfirm && person.password !== confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden.",
      })
    }
  })

function computePersonErrors(
  person: Person | null,
  confirmPassword: string,
): Record<string, string> {
  if (!person) {
    return {}
  }

  const nextErrors: Record<string, string> = {}
  const parsed = employeePersonSchema.safeParse({ person, confirmPassword })
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      nextErrors[`${EMPLOYEE_FIELD_PREFIX}.${issue.path.join(".")}`] ??= issue.message
    }
  }

  return nextErrors
}

const EMPLOYEE_FIELD_PREFIX = "employee"

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
    establishment: null,
    cargo: null,
  }
}

export function ManageEmployeeDialog({
  open,
  onOpenChange,
  employeeId,
}: ManageEmployeeDialogProps) {
  const { notify } = useNotify()
  const isEditMode = Boolean(employeeId)
  const [createdEmployeeId, setCreatedEmployeeId] = useState<number | null>(null)

  const [person, setPerson] = useState<Person | null>(createEmptyPerson())
  const [establishment, setEstablishment] = useState<CatalogItem | null>(null)
  const [cargo, setCargo] = useState<CatalogItem | null>(null)
  const [roleId, setRoleId] = useState<number | null>(null)

  const [personErrors, setPersonErrors] = useState<Record<string, string>>({})
  const [fieldErrors, setFieldErrors] = useState<{ establishment?: string }>({})
  const [confirmPassword, setConfirmPassword] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [matchedFuncionarioId, setMatchedFuncionarioId] = useState<number | null>(null)

  const activeEmployeeId = isEditMode ? (employeeId ?? null) : createdEmployeeId

  const employeeQuery = useEmployeeQuery(employeeId ?? null, open && isEditMode)
  const { data: roles = [] } = useEmployeeRolesQuery()
  const { data: cargos = [] } = useCatalogQuery<CatalogItem>(CATALOGS.CARGOS)
  const { data: establishments = [] } = useEstablishmentsOptionsQuery(open)

  const roleItems = toSelectOptions(roles)
  const cargoItems = toSelectOptions(cargos)
  const establishmentItems = toSelectOptions(establishments)

  useEffect(() => {
    if (Object.keys(personErrors).length === 0) return
    setPersonErrors(computePersonErrors(person, confirmPassword))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `personErrors` es guard, no dep.
  }, [person, confirmPassword])

  function applyLoadedEmployee(employee: Employee) {
    setPerson(employee.person)
    setEstablishment(employee.establishment ?? null)
    setCargo(employee.cargo ?? null)
    setRoleId(employee.permissions[0]?.role.id ?? null)
    setPersonErrors({})
    setFieldErrors({})
    setConfirmPassword(employee.person.password)
    setPhoto(null)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    if (!isEditMode) {
      setPerson(createEmptyPerson())
      setEstablishment(null)
      setCargo(null)
      setRoleId(null)
      setPersonErrors({})
      setFieldErrors({})
      setConfirmPassword("")
      setPhoto(null)
      setCreatedEmployeeId(null)
      setMatchedFuncionarioId(null)
      return
    }

    if (employeeQuery.data?.status === "ok") {
      applyLoadedEmployee(employeeQuery.data.employee)
    }
  }, [employeeQuery.data, isEditMode, open])

  // El autocompletado por documento puede encontrar que la persona YA es
  // funcionario activo — en ese caso el alta se trata como edición de ese
  // registro desde ya.
  const matchedEmployeeQuery = useEmployeeQuery(
    matchedFuncionarioId,
    open && !isEditMode && matchedFuncionarioId !== null,
  )

  useEffect(() => {
    if (!open || isEditMode || matchedFuncionarioId === null) return

    if (matchedEmployeeQuery.data?.status === "ok") {
      applyLoadedEmployee(matchedEmployeeQuery.data.employee)
      setCreatedEmployeeId(matchedFuncionarioId)
    }
  }, [matchedEmployeeQuery.data, isEditMode, open, matchedFuncionarioId])

  const createPersonMutation = useCreateWithPerson({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible guardar el usuario.", {
          variant: "error",
        })
      },
    },
  })

  const createMutation = useCreate({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible crear el funcionario.", {
          variant: "error",
        })
      },
    },
  })

  const updateMutation = useUpdate({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible actualizar el funcionario.", {
          variant: "error",
        })
      },
    },
  })

  const assignRoleMutation = useAssignRole({
    mutationConfig: {
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible asignar el rol.", { variant: "error" })
      },
    },
  })

  const isSavingMain =
    createPersonMutation.isPending ||
    createMutation.isPending ||
    updateMutation.isPending ||
    assignRoleMutation.isPending

  async function handleMainSave() {
    const draft = person as Person | null

    if (!draft) {
      notify("No hay datos del usuario para guardar.", { variant: "error" })
      return
    }

    const nextPersonErrors = computePersonErrors(draft, confirmPassword)
    const nextFieldErrors: { establishment?: string } = {}
    if (!establishment) {
      nextFieldErrors.establishment = "Selecciona el establecimiento."
    }

    if (Object.keys(nextPersonErrors).length > 0 || Object.keys(nextFieldErrors).length > 0) {
      setPersonErrors(nextPersonErrors)
      setFieldErrors(nextFieldErrors)
      return
    }
    setPersonErrors({})
    setFieldErrors({})

    if (env.ENABLE_API_MOCKING) {
      const payload: Employee = {
        id: activeEmployeeId ?? undefined,
        person: draft,
        ...createEmptyEmployeeShell(),
        establishment,
        cargo,
        permissions: roleId
          ? [
              {
                order: 1,
                role: roles.find((item) => item.id === roleId) ?? {
                  id: roleId,
                  code: "",
                  name: "",
                },
                workSchedule: { id: 0, code: "", name: "" },
                status: "ACTIVE",
              },
            ]
          : [],
      }

      if (!activeEmployeeId) {
        if (!draft.id) {
          const result = await createPersonMutation.mutateAsync(draft)
          if (result.status === "error") {
            notify(result.message, { variant: "error" })
            return
          }
          payload.person = result.person
        }

        const result = await createMutation.mutateAsync(payload)
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        setCreatedEmployeeId(result.employee.id ?? null)
        notify(SUCCESS_MESSAGES.employee.created)
        onOpenChange(false)
        return
      }

      const result = await updateMutation.mutateAsync({
        employeeId: activeEmployeeId,
        values: payload,
        foto: photo,
      })
      if (result.status === "error") {
        notify(result.message, { variant: "error" })
        return
      }
      notify(SUCCESS_MESSAGES.employee.updated)
      onOpenChange(false)
      return
    }

    // --- Backend real ---
    try {
      let funcionarioId = activeEmployeeId

      if (!funcionarioId) {
        // 1) Cuenta + TFUNCIONARIO "pendiente" (sin establecimiento aún) —
        //    /register/pigse/funcionario (auth-center) crea el login.
        let persistedPerson = draft
        if (!persistedPerson.id) {
          // Cualquier corrección que el usuario haya hecho sobre lo que
          // trajo el autocompletado (`onMatched`) viaja igual: el PUT del
          // paso 2 siempre manda `draft` completo, sin importar si
          // `registerFuncionario` reusó una cuenta existente.
          const registered = await registerFuncionario(persistedPerson, photo)
          persistedPerson = { ...persistedPerson, id: registered.pkFuncionario }
          funcionarioId = registered.pkFuncionario
        } else {
          funcionarioId = persistedPerson.id
        }
        setPerson(persistedPerson)
      }

      // 2) Establecimiento + cargo + datos de persona -- PUT /funcionarios/:id
      //    (fn_fun_actualizar). Corre siempre, tanto para fijar el
      //    establecimiento del recién creado como para editar uno existente.
      await updateFuncionario(funcionarioId as number, {
        id: funcionarioId as number,
        person: draft,
        ...createEmptyEmployeeShell(),
        establishment,
        cargo,
      })

      // 3) Rol -- aparte, porque PIGSE no tiene "permisos" (rol+jornada+
      //    estado): fn_fun_asignar_rol fija el rol dentro del
      //    establecimiento recién asignado.
      if (roleId) {
        await assignRoleMutation.mutateAsync({ employeeId: funcionarioId as number, roleId })
      }

      setCreatedEmployeeId(funcionarioId)
      notify(isEditMode ? SUCCESS_MESSAGES.employee.updated : SUCCESS_MESSAGES.employee.created)
      onOpenChange(false)
    } catch (error) {
      notify(error instanceof Error ? error.message : "No fue posible guardar el funcionario.", {
        variant: "error",
      })
    }
  }

  const mainTitle = isEditMode ? "Editar usuario" : "Agregar usuario"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] overflow-y-auto overflow-x-hidden"
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{mainTitle}</DialogTitle>
        </DialogHeader>

        <NoticeOutlet className="mb-2" />

        <UserDetailsForm
          value={person}
          onChange={setPerson}
          fieldPrefix={EMPLOYEE_FIELD_PREFIX}
          errors={personErrors}
          invalidFields={Object.keys(personErrors)}
          showValidation
          confirmPassword={confirmPassword}
          onConfirmPasswordChange={setConfirmPassword}
          photo={photo}
          onPhotoChange={setPhoto}
          onMatched={(found) => {
            setMatchedFuncionarioId(found?.id ?? null)
          }}
        />

        <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-3">
          <Field
            orientation="vertical"
            variant="outlined"
            data-invalid={fieldErrors.establishment ? "true" : undefined}
          >
            <FieldLabel htmlFor="employee-establishment">Establecimiento*</FieldLabel>
            <ComboboxField
              id="employee-establishment"
              value={establishment?.id ?? null}
              onValueChange={(value) => {
                const option = establishments.find((item) => item.id === value)
                setEstablishment(option ? { id: option.id, code: "", name: option.name } : null)
              }}
              items={toSelectItemsMap(establishmentItems)}
            >
              <ComboboxFieldTrigger aria-invalid={Boolean(fieldErrors.establishment)}>
                <ComboboxFieldValue placeholder="Seleccionar" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {establishmentItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
            <FieldError>{fieldErrors.establishment}</FieldError>
          </Field>

          <Field orientation="vertical" variant="outlined">
            <FieldLabel htmlFor="employee-cargo">Cargo</FieldLabel>
            <ComboboxField
              id="employee-cargo"
              value={cargo?.id ?? null}
              onValueChange={(value) => {
                const option = cargos.find((item) => item.id === value)
                setCargo(option ?? null)
              }}
              items={toSelectItemsMap(cargoItems)}
            >
              <ComboboxFieldTrigger>
                <ComboboxFieldValue placeholder="Seleccionar" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {cargoItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>

          <Field orientation="vertical" variant="outlined">
            <FieldLabel htmlFor="employee-role">Rol</FieldLabel>
            <ComboboxField
              id="employee-role"
              value={roleId}
              onValueChange={(value) => setRoleId(value ?? null)}
              items={toSelectItemsMap(roleItems)}
            >
              <ComboboxFieldTrigger>
                <ComboboxFieldValue placeholder="Seleccionar" />
              </ComboboxFieldTrigger>
              <ComboboxFieldContent>
                {roleItems.map((item) => (
                  <ComboboxFieldItem key={item.value} value={item.value}>
                    {item.label}
                  </ComboboxFieldItem>
                ))}
              </ComboboxFieldContent>
            </ComboboxField>
          </Field>
        </div>

        <DialogFooter className="justify-end sm:justify-end">
          <Button
            variant="fill"
            color="primary"
            size="sm"
            onClick={() => void handleMainSave()}
            disabled={isSavingMain}
          >
            <CheckIcon data-icon="inline-start" />
            {isSavingMain ? "Guardando..." : "Guardar"}
          </Button>
          <Button
            variant="fill"
            color="neutral"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isSavingMain}
          >
            <XIcon data-icon="inline-start" />
            Cancelar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
