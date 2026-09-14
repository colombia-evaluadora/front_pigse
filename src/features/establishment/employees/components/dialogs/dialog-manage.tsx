import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { z } from "zod"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { CheckIcon, ControlPointIcon, PencilIcon, XIcon } from "@/components/ui/icons"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
} from "@/components/ui/combobox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data/table"
import {
  TableSortableHeader,
  compareBySortKey,
  type TableSort,
} from "@/components/table-sort-header"
import { CATALOGS } from "@/lib/catalogs"
import { toSelectItemsMap, toSelectOptions } from "@/lib/catalog-options"
import { SUCCESS_MESSAGES } from "@/lib/success-messages"
import { getErrorMessage } from "@/lib/api-client"
import { optionalImageFile } from "@/lib/image-file"
import { env } from "@/config/env"

import { useCreate } from "@/features/establishment/employees/api/mutations/use-create"
import { useCreateWithPerson } from "@/features/establishment/employees/api/mutations/use-create-with-person"
import { update as updateFuncionario } from "@/features/establishment/employees/api/mutations/update"
import { useUpdate } from "@/features/establishment/employees/api/mutations/use-update"
import { registerFuncionario } from "@/features/establishment/employees/api/mutations/use-register-funcionario"
import {
  toCrearItem,
  updateEmployeePermissions,
  type PermissionSyncItem,
} from "@/features/establishment/employees/api/mutations/update-permissions"
import { useCatalogQuery } from "@/features/establishment/employees/api/query/use-catalogs"
import { useEmployeeQuery } from "@/features/establishment/employees/api/query/use-employee"
import { useEmployeeRolesQuery } from "@/features/establishment/employees/api/query/use-employee-roles"
import { useCampusesOptionsQuery } from "@/features/establishment/campuses/api/query/use-campuses-options"
import {
  createAdditionalInfoFromEmployee,
  EmployeeAdditionalInfoForm,
  type EmployeeAdditionalInfoValue,
} from "@/features/establishment/employees/components/forms/form-employee-additional-info"
import type { CatalogItem } from "@/types/catalog"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { Person } from "@/features/establishment/employees/api/types/person"
import {
  PERMISSION_STATUS_OPTIONS,
  type Permission,
  type PermissionStatus,
} from "@/features/establishment/institution/api/types/permission"
import { passwordRules } from "@/features/auth/api/schema"
import {
  PASSWORD_PLACEHOLDER,
  UserDetailsForm,
} from "@/features/establishment/employees/components/forms/form-sections/user-details-section"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"

interface ManageEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: number | null
}

interface PermissionDraft {
  order: string
  roleId: number | null
  campusId: number | null
  workScheduleId: number | null
  status: PermissionStatus | ""
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
  // La foto es estado aparte (viaja como binario del multipart, no como JSON),
  // pero se valida en el mismo paso: es el último punto antes de armar el
  // envío, y sin esto un archivo fuera de regla llegaba entero al gateway.
  photo?: File | null,
): Record<string, string> {
  const nextErrors: Record<string, string> = {}

  const parsedPhoto = optionalImageFile.safeParse(photo)
  if (!parsedPhoto.success) {
    nextErrors[`${EMPLOYEE_FIELD_PREFIX}.photo`] =
      parsedPhoto.error.issues[0]?.message ?? "Archivo no válido."
  }

  if (!person) {
    return nextErrors
  }

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
  }
}

function createInitialAdditionalInfo(): EmployeeAdditionalInfoValue {
  return {
    employeeClass: null,
    educationLevel: null,
    grade: null,
    highestEducationLevel: null,
    fundingSource: null,
    functionalPosition: null,
    employmentType: null,
    address: "",
  }
}

/** ¿La información complementaria trae algo? -- mismo criterio que CEVAL
 * para decidir si el botón entra en modo "editar" (lápiz) o "agregar" (+). */
function hasAdditionalInfoData(value: EmployeeAdditionalInfoValue): boolean {
  return (
    value.employeeClass !== null ||
    value.educationLevel !== null ||
    value.grade !== null ||
    value.highestEducationLevel !== null ||
    value.fundingSource !== null ||
    value.functionalPosition !== null ||
    value.employmentType !== null ||
    value.address.trim() !== ""
  )
}

function createPermissionDraft(nextOrder = 1): PermissionDraft {
  return { order: String(nextOrder), roleId: null, campusId: null, workScheduleId: null, status: "" }
}

/**
 * Huella serializable de TODO lo editable del diálogo principal, para poder
 * responder "¿hay algo sin guardar?" sin espejar cada campo en un estado
 * aparte. `password`/`accountExists` quedan fuera a propósito: al cargar un
 * funcionario existente la contraseña es el valor decorativo
 * `PASSWORD_PLACEHOLDER`, no un dato del backend, y compararla marcaría
 * cambios donde no los hay.
 *
 * Igual que CEVAL desde V390: establecimiento y cargo ya NO se piden acá
 * (el establecimiento se deriva de la sede al asignar un permiso, y el
 * cargo lo cubre el rol) — en su lugar entra `additionalInfo`
 * ("información complementaria", los mismos 8 campos que CEVAL).
 */
function buildDraftSnapshot(
  person: Person,
  additionalInfo: EmployeeAdditionalInfoValue,
  permissions: Permission[],
): string {
  const { password: _password, accountExists: _accountExists, ...personRest } = person
  return JSON.stringify({ person: personRest, additionalInfo, permissions })
}

const permissionDraftSchema = z.object({
  order: z
    .string()
    .trim()
    .min(1, "Ingresa el orden.")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "El orden debe ser un número entero mayor que cero.",
    }),
  roleId: z.custom<number>((value) => typeof value === "number", { message: "Selecciona el rol." }),
  campusId: z.custom<number>((value) => typeof value === "number", { message: "Selecciona la sede." }),
  workScheduleId: z.custom<number>((value) => typeof value === "number", {
    message: "Selecciona la jornada.",
  }),
  status: z.custom<PermissionStatus>((value) => typeof value === "string" && value !== "", {
    message: "Selecciona el estado.",
  }),
})

const PERMISSION_STATUS_BADGE: Record<PermissionStatus, { variant: "soft"; color: "success" | "destructive" }> = {
  ACTIVE: { variant: "soft", color: "success" },
  SUSPENDED: { variant: "soft", color: "destructive" },
}

type PermissionSortKey = "order" | "role" | "campus" | "workSchedule" | "status"

function permissionSortValue(permission: Permission, key: PermissionSortKey): unknown {
  switch (key) {
    case "order":
      return permission.order
    case "role":
      return permission.role.name
    case "campus":
      return permission.campusName
    case "workSchedule":
      return permission.workSchedule.name
    case "status":
      return permission.status
  }
}

const PERMISSION_ACTIONS_CELL_CLASS = "sticky right-0 z-10 w-px"
const PERMISSION_ACTIONS_SPACER_WIDTH = 96
const PERMISSION_ACTIONS_SPACER_CELL = (
  <td aria-hidden className="p-0">
    <div style={{ width: PERMISSION_ACTIONS_SPACER_WIDTH }} />
  </td>
)
const PERMISSION_ACTIONS_SPACER_HEAD = (
  <th aria-hidden className="p-0">
    <div style={{ width: PERMISSION_ACTIONS_SPACER_WIDTH }} />
  </th>
)

export function ManageEmployeeDialog({
  open,
  onOpenChange,
  employeeId,
}: ManageEmployeeDialogProps) {
  const { notify } = useNotify()
  const queryClient = useQueryClient()
  const isEditMode = Boolean(employeeId)
  const [createdEmployeeId, setCreatedEmployeeId] = useState<number | null>(null)

  const [person, setPerson] = useState<Person | null>(createEmptyPerson())
  const [additionalInfo, setAdditionalInfo] = useState<EmployeeAdditionalInfoValue>(
    createInitialAdditionalInfo,
  )
  const [permissions, setPermissions] = useState<Permission[]>([])

  const [personErrors, setPersonErrors] = useState<Record<string, string>>({})
  const [confirmPassword, setConfirmPassword] = useState("")
  const [photo, setPhoto] = useState<File | null>(null)
  const [matchedFuncionarioId, setMatchedFuncionarioId] = useState<number | null>(null)

  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [permissionDraft, setPermissionDraft] = useState<PermissionDraft>(createPermissionDraft)
  const [permissionErrors, setPermissionErrors] = useState<Record<string, string>>({})
  const [permissionSort, setPermissionSort] = useState<TableSort<PermissionSortKey>>(null)
  const [permissionsSaved, setPermissionsSaved] = useState(false)
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)
  const [originalPermissionIds, setOriginalPermissionIds] = useState<Set<number>>(new Set())

  const [additionalInfoDialogOpen, setAdditionalInfoDialogOpen] = useState(false)
  const [additionalInfoSaved, setAdditionalInfoSaved] = useState(false)

  // Huella de lo último "limpio" (recién cargado o recién guardado). `null`
  // mientras se está dando de alta: en alta siempre hay algo por guardar.
  const cleanSnapshotRef = useRef<string | null>(null)
  // Huella de los permisos tal como quedaron persistidos: es contra esto que
  // se decide si el sub-diálogo tiene cambios reales y qué restaurar al
  // cancelarlo.
  const permissionsSnapshotRef = useRef<string>(JSON.stringify([]))
  // Mismo criterio, para el sub-diálogo de información complementaria.
  const additionalInfoSnapshotRef = useRef<string>(JSON.stringify(createInitialAdditionalInfo()))

  const activeEmployeeId = isEditMode ? (employeeId ?? null) : createdEmployeeId
  const canOpenPermissions = Boolean(activeEmployeeId)

  const employeeQuery = useEmployeeQuery(employeeId ?? null, open && isEditMode)
  const { data: roles = [] } = useEmployeeRolesQuery()
  const { data: workSchedules = [] } = useCatalogQuery<CatalogItem>(CATALOGS.WORK_SCHEDULES)
  // `GET /sedes/opciones` ya viene acotado por lo que el usuario logueado
  // puede ver -- a diferencia de antes, ya NO se filtra por un
  // establecimiento elegido a mano (V390: el establecimiento del
  // funcionario se DERIVA de la sede que se le asigne acá, no al revés).
  const { data: campuses = [] } = useCampusesOptionsQuery(open)

  const roleItems = toSelectOptions(roles)
  const workScheduleItems = toSelectOptions(workSchedules)
  const campusItems = toSelectOptions(campuses)
  const permissionStatusItems = PERMISSION_STATUS_OPTIONS.map((status) => ({
    value: status.code,
    label: status.name,
  }))

  const sortedPermissions = useMemo(() => {
    if (!permissionSort) return permissions
    const { key, dir } = permissionSort
    const sorted = [...permissions].sort((a, b) =>
      compareBySortKey(permissionSortValue(a, key), permissionSortValue(b, key)),
    )
    return dir === "desc" ? sorted.reverse() : sorted
  }, [permissions, permissionSort])

  useEffect(() => {
    if (Object.keys(personErrors).length === 0) return
    setPersonErrors(computePersonErrors(person, confirmPassword, photo))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `personErrors` es guard, no dep.
  }, [person, confirmPassword, photo])

  function applyLoadedEmployee(employee: Employee) {
    // El backend nunca devuelve la contraseña (`use-employee.ts` la manda
    // como ""): al editar, el campo se muestra con el valor decorativo y
    // bloqueado (`accountExists`) — así no se cambia por accidente la
    // contraseña de una cuenta existente con solo abrir el diálogo.
    const loadedPerson: Person = {
      ...employee.person,
      accountExists: true,
      password: PASSWORD_PLACEHOLDER,
    }
    const loadedAdditionalInfo = createAdditionalInfoFromEmployee(employee)

    setPerson(loadedPerson)
    setAdditionalInfo(loadedAdditionalInfo)
    setPermissions(employee.permissions)
    setOriginalPermissionIds(
      new Set(employee.permissions.map((p) => p.id).filter((id): id is number => id !== undefined)),
    )
    setPermissionDraft(createPermissionDraft(employee.permissions.length + 1))
    setPersonErrors({})
    setPermissionErrors({})
    setConfirmPassword(PASSWORD_PLACEHOLDER)
    setPhoto(null)
    setPermissionsSaved(employee.permissions.length > 0)
    setAdditionalInfoSaved(hasAdditionalInfoData(loadedAdditionalInfo))
    cleanSnapshotRef.current = buildDraftSnapshot(loadedPerson, loadedAdditionalInfo, employee.permissions)
    permissionsSnapshotRef.current = JSON.stringify(employee.permissions)
    additionalInfoSnapshotRef.current = JSON.stringify(loadedAdditionalInfo)
  }

  useEffect(() => {
    if (!open) {
      return
    }

    if (!isEditMode) {
      setPerson(createEmptyPerson())
      setAdditionalInfo(createInitialAdditionalInfo())
      setPermissions([])
      setOriginalPermissionIds(new Set())
      setPermissionDraft(createPermissionDraft())
      setPersonErrors({})
      setPermissionErrors({})
      setConfirmPassword("")
      setPhoto(null)
      setCreatedEmployeeId(null)
      setMatchedFuncionarioId(null)
      setPermissionsSaved(false)
      setAdditionalInfoSaved(false)
      cleanSnapshotRef.current = null
      permissionsSnapshotRef.current = JSON.stringify([])
      additionalInfoSnapshotRef.current = JSON.stringify(createInitialAdditionalInfo())
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

  const updateAdditionalInfoMutation = useUpdate({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Información complementaria actualizada.")
      },
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible actualizar la información complementaria.", {
          variant: "error",
        })
      },
    },
  })

  const isSavingMain =
    createPersonMutation.isPending || createMutation.isPending || updateMutation.isPending

  const hasUnsavedChanges =
    cleanSnapshotRef.current === null ||
    photo !== null ||
    (person !== null &&
      buildDraftSnapshot(person, additionalInfo, permissions) !== cleanSnapshotRef.current)

  const hasPermissionsChanges = JSON.stringify(permissions) !== permissionsSnapshotRef.current
  const hasAdditionalInfoChanges =
    JSON.stringify(additionalInfo) !== additionalInfoSnapshotRef.current

  async function handleMainSave() {
    const draft = person as Person | null

    if (!draft) {
      notify("No hay datos del usuario para guardar.", { variant: "error" })
      return
    }

    const nextPersonErrors = computePersonErrors(draft, confirmPassword, photo)

    if (Object.keys(nextPersonErrors).length > 0) {
      setPersonErrors(nextPersonErrors)
      return
    }
    setPersonErrors({})

    if (env.ENABLE_API_MOCKING) {
      const payload: Employee = {
        id: activeEmployeeId ?? undefined,
        person: draft,
        ...createEmptyEmployeeShell(),
        ...additionalInfo,
        permissions,
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
        // El diálogo queda abierto para asignar permisos: lo recién
        // persistido pasa a ser la huella "limpia" y Guardar se esconde
        // hasta que se vuelva a tocar algo.
        cleanSnapshotRef.current = buildDraftSnapshot(payload.person, additionalInfo, permissions)
        notify(
          permissions.length === 0
            ? "Usuario guardado. Puedes asignar permisos."
            : SUCCESS_MESSAGES.employee.created,
        )
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
          const registered = await registerFuncionario(persistedPerson, photo)
          persistedPerson = { ...persistedPerson, id: registered.pkFuncionario }
          funcionarioId = registered.pkFuncionario
        } else {
          funcionarioId = persistedPerson.id
        }
        setPerson(persistedPerson)
      }

      // 2) Datos de persona + información complementaria -- PUT
      //    /funcionarios/:id (fn_fun_actualizar). Corre siempre. El
      //    establecimiento NO se fija acá (V390): se deriva de la sede la
      //    primera vez que se le asigna un permiso.
      await updateFuncionario(funcionarioId as number, {
        id: funcionarioId as number,
        person: draft,
        ...createEmptyEmployeeShell(),
        ...additionalInfo,
      })

      setCreatedEmployeeId(funcionarioId)
      cleanSnapshotRef.current = buildDraftSnapshot(draft, additionalInfo, permissions)

      if (!activeEmployeeId) {
        notify(
          permissions.length === 0
            ? "Funcionario guardado. Puedes asignar permisos."
            : SUCCESS_MESSAGES.employee.created,
        )
        return
      }

      notify(SUCCESS_MESSAGES.employee.updated)
      onOpenChange(false)
    } catch (error) {
      notify(error instanceof Error ? error.message : "No fue posible guardar el funcionario.", {
        variant: "error",
      })
    }
  }

  function addPermission() {
    const parsed = permissionDraftSchema.safeParse(permissionDraft)

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        const path = issue.path.join(".")
        nextErrors[path] ??= issue.message
      }
      setPermissionErrors(nextErrors)
      return
    }

    setPermissionErrors({})
    const draft = parsed.data

    const role = roles.find((item) => item.id === draft.roleId)
    const campus = campuses.find((item) => item.id === draft.campusId)
    const workSchedule = workSchedules.find((item) => item.id === draft.workScheduleId)

    if (!role || !campus || !workSchedule) {
      notify("No fue posible resolver los datos del permiso seleccionado.", { variant: "error" })
      return
    }

    // `fn_fun_permisos_actualizar` no tiene "editar": dos permisos con el
    // mismo rol+sede+jornada serían dos filas indistinguibles en
    // TSEDE_USUARIO, y dos con el mismo rol+sede+orden dejan el ORDEN
    // ambiguo. Se rechazan acá, antes de entrar al borrador.
    const sameRoleAndCampus = permissions.filter(
      (permission) => permission.role.id === role.id && permission.campusId === campus.id,
    )
    if (sameRoleAndCampus.some((permission) => permission.workSchedule.id === workSchedule.id)) {
      notify(
        `Ya existe un permiso de ${role.name} en ${campus.name} con la jornada ${workSchedule.name}.`,
        { variant: "error" },
      )
      return
    }
    if (sameRoleAndCampus.some((permission) => permission.order === Number(draft.order))) {
      notify(`Ya existe un permiso de ${role.name} en ${campus.name} con el orden ${draft.order}.`, {
        variant: "error",
      })
      return
    }

    const nextPermission: Permission = {
      order: Number(draft.order),
      role,
      workSchedule,
      status: draft.status,
      campusId: campus.id,
      campusName: campus.name,
    }

    setPermissions((current) => [...current, nextPermission])
    setPermissionDraft(createPermissionDraft(permissions.length + 2))
    notify(`Permiso de ${role.name} en ${campus.name} agregado.`)
  }

  function removePermission(order: number) {
    const removed = permissions.find((permission) => permission.order === order)

    // Solo se filtra: renumerar el resto cambiaría el ORDEN persistido de
    // permisos que nadie tocó, y `fn_fun_permisos_actualizar` no tiene
    // "editar" para sincronizar ese cambio (solo crear/eliminar).
    setPermissions((current) => current.filter((permission) => permission.order !== order))

    notify(
      removed
        ? `Permiso de ${removed.role.name} en ${removed.campusName} eliminado.`
        : "Permiso eliminado.",
    )
  }

  /**
   * `PUT /funcionario/:ID/permisos` (`pigse.fn_fun_permisos_actualizar`,
   * V370) es el único caller de este diff: altas (permisos sin `id`) y
   * bajas (`id`s que ya no están en `permissions`). No soporta "editar" un
   * permiso existente -- mismo límite que la función SQL.
   */
  async function closePermissionsDialog() {
    if (env.ENABLE_API_MOCKING || !activeEmployeeId) {
      setPermissionsSaved(true)
      setPermissionsDialogOpen(false)
      permissionsSnapshotRef.current = JSON.stringify(permissions)
      notify("Permisos agregados al borrador. Pulsa Guardar para persistir el funcionario.", {
        variant: "info",
      })
      return
    }

    const currentIds = new Set(
      permissions.map((permission) => permission.id).filter((id): id is number => id !== undefined),
    )
    const toDelete = [...originalPermissionIds].filter((id) => !currentIds.has(id))
    const toCreate = permissions.filter((permission) => permission.id === undefined)

    if (toDelete.length === 0 && toCreate.length === 0) {
      setPermissionsSaved(true)
      setPermissionsDialogOpen(false)
      permissionsSnapshotRef.current = JSON.stringify(permissions)
      if (person) {
        cleanSnapshotRef.current = buildDraftSnapshot(person, additionalInfo, permissions)
      }
      return
    }

    setIsSavingPermissions(true)
    try {
      const items: PermissionSyncItem[] = [
        ...toDelete.map((id): PermissionSyncItem => ({ accion: "eliminar", id })),
        ...toCreate.map((permission) => toCrearItem(permission, permission.campusId as number)),
      ]
      const results = await updateEmployeePermissions(activeEmployeeId, items)

      const createdIds = results.filter((row) => row.accion === "crear").map((row) => row.id)
      let createdIndex = 0
      const nextPermissions = permissions.map((permission) => {
        if (permission.id !== undefined) return permission
        const id = createdIds[createdIndex]
        createdIndex += 1
        return id === undefined ? permission : { ...permission, id }
      })
      setPermissions(nextPermissions)
      setOriginalPermissionIds(new Set([...currentIds, ...createdIds]))
      permissionsSnapshotRef.current = JSON.stringify(nextPermissions)
      if (person) {
        cleanSnapshotRef.current = buildDraftSnapshot(person, additionalInfo, nextPermissions)
      }
      // El listado de funcionarios muestra sede/jornada/estado derivados de
      // estos permisos, y el establecimiento del funcionario se acaba de
      // derivar server-side de la sede recién asignada (V390,
      // fn_fun_permisos_actualizar) -- sin invalidar, la tabla y el detalle
      // de atrás quedan viejos.
      void queryClient.invalidateQueries({ queryKey: ["employees"] })

      setPermissionsSaved(true)
      setPermissionsDialogOpen(false)
      notify("Permisos actualizados.")
    } catch (error) {
      notify(error instanceof Error ? error.message : "No fue posible actualizar los permisos.", {
        variant: "error",
      })
    } finally {
      setIsSavingPermissions(false)
    }
  }

  /**
   * Cerrar el sub-diálogo sin guardar descarta el borrador: se restauran los
   * permisos tal como estaban persistidos (`permissionsSnapshotRef`) en vez
   * de dejar altas/bajas sueltas en el estado del diálogo principal.
   */
  function handlePermissionsDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      const savedPermissions: Permission[] = JSON.parse(permissionsSnapshotRef.current)
      setPermissions(savedPermissions)
      setPermissionDraft(createPermissionDraft(savedPermissions.length + 1))
      setPermissionErrors({})
    }
    setPermissionsDialogOpen(nextOpen)
  }

  async function closeAdditionalInfoDialog() {
    if (env.ENABLE_API_MOCKING || !activeEmployeeId || !person) {
      setAdditionalInfoSaved(true)
      setAdditionalInfoDialogOpen(false)
      additionalInfoSnapshotRef.current = JSON.stringify(additionalInfo)
      notify(
        "Información complementaria agregada al borrador. Pulsa Guardar para persistir el funcionario.",
        { variant: "info" },
      )
      return
    }

    await updateAdditionalInfoMutation.mutateAsync({
      employeeId: activeEmployeeId,
      values: {
        id: activeEmployeeId,
        person,
        ...additionalInfo,
        permissions,
        status: "ACTIVE",
      },
      foto: null,
    })

    setAdditionalInfoSaved(true)
    setAdditionalInfoDialogOpen(false)
    additionalInfoSnapshotRef.current = JSON.stringify(additionalInfo)
    cleanSnapshotRef.current = buildDraftSnapshot(person, additionalInfo, permissions)
  }

  /**
   * Cerrar el sub-diálogo sin guardar descarta el borrador: se restaura la
   * información complementaria tal como estaba persistida.
   */
  function handleAdditionalInfoDialogOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setAdditionalInfo(JSON.parse(additionalInfoSnapshotRef.current))
    }
    setAdditionalInfoDialogOpen(nextOpen)
  }

  const mainTitle = isEditMode ? "Editar usuario" : "Agregar usuario"

  return (
    <>
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
            // Borrar la foto YA guardada: el form limpia
            // `person.photoArchivoId` (la vista previa desaparece y el
            // mock deja de persistirla) y acá se descarta cualquier
            // archivo que hubiera quedado en cola. En backend real el
            // borrado todavía no se puede persistir:
            // `PUT /funcionarios/:ID` (`pigse.fn_fun_actualizar`,
            // V257/V369) no declara ningún bind de foto — ver `update.ts`.
            onRemovePhoto={() => setPhoto(null)}
            onMatched={(found) => {
              setMatchedFuncionarioId(found?.id ?? null)
            }}
          />

          <DialogFooter className="flex-row flex-wrap items-center justify-between gap-3 sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {canOpenPermissions && (
                <Button
                  variant="fill"
                  color="primary"
                  size="sm"
                  onClick={() => setPermissionsDialogOpen(true)}
                >
                  {permissionsSaved ? (
                    <PencilIcon data-icon="inline-start" />
                  ) : (
                    <ControlPointIcon data-icon="inline-start" />
                  )}
                  {permissionsSaved ? `Permisos / ${permissions.length}` : "Permisos"}
                </Button>
              )}

              {canOpenPermissions && permissionsSaved && (
                <Button
                  variant="fill"
                  color="primary"
                  size="sm"
                  onClick={() => setAdditionalInfoDialogOpen(true)}
                >
                  {additionalInfoSaved ? (
                    <PencilIcon data-icon="inline-start" />
                  ) : (
                    <ControlPointIcon data-icon="inline-start" />
                  )}
                  Información complementaria
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {hasUnsavedChanges && !permissionsDialogOpen && !additionalInfoDialogOpen && (
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
              )}
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
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsDialogOpen} onOpenChange={handlePermissionsDialogOpenChange}>
        <DialogContent
          className="w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] overflow-y-auto overflow-x-hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Asignar permisos</DialogTitle>
          </DialogHeader>

          <div className="flex flex-wrap items-end gap-4">
            <Field
              orientation="vertical"
              variant="outlined"
              className="min-w-40 grow basis-[calc(20%-1rem)]"
              data-invalid={permissionErrors["order"] ? "true" : undefined}
            >
              <FieldLabel htmlFor="permission-order">Orden*</FieldLabel>
              <Input
                id="permission-order"
                placeholder="Agregar"
                type="number"
                min={1}
                value={permissionDraft.order}
                onChange={(event) =>
                  setPermissionDraft((prev) => ({ ...prev, order: event.target.value }))
                }
              />
              <div className="min-h-5">
                <FieldError>{permissionErrors["order"]}</FieldError>
              </div>
            </Field>

            <Field
              orientation="vertical"
              variant="outlined"
              className="min-w-56 grow basis-[calc(20%-1rem)]"
              data-invalid={permissionErrors["campusId"] ? "true" : undefined}
            >
              <FieldLabel htmlFor="permission-campus">Sede*</FieldLabel>
              <ComboboxField
                id="permission-campus"
                value={permissionDraft.campusId}
                onValueChange={(value) =>
                  setPermissionDraft((prev) => ({ ...prev, campusId: value ?? null }))
                }
                items={toSelectItemsMap(campusItems)}
              >
                <ComboboxFieldTrigger aria-invalid={Boolean(permissionErrors["campusId"])}>
                  <ComboboxFieldValue placeholder="Seleccionar" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {campusItems.map((item) => (
                    <ComboboxFieldItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxFieldContent>
              </ComboboxField>
              <div className="min-h-5">
                <FieldError>{permissionErrors["campusId"]}</FieldError>
              </div>
            </Field>

            <Field
              orientation="vertical"
              variant="outlined"
              className="min-w-56 grow basis-[calc(20%-1rem)]"
              data-invalid={permissionErrors["roleId"] ? "true" : undefined}
            >
              <FieldLabel htmlFor="permission-role">Rol*</FieldLabel>
              <ComboboxField
                id="permission-role"
                value={permissionDraft.roleId}
                onValueChange={(value) =>
                  setPermissionDraft((prev) => ({ ...prev, roleId: value ?? null }))
                }
                items={toSelectItemsMap(roleItems)}
              >
                <ComboboxFieldTrigger aria-invalid={Boolean(permissionErrors["roleId"])}>
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
              <div className="min-h-5">
                <FieldError>{permissionErrors["roleId"]}</FieldError>
              </div>
            </Field>

            <Field
              orientation="vertical"
              variant="outlined"
              className="min-w-56 grow basis-[calc(20%-1rem)]"
              data-invalid={permissionErrors["workScheduleId"] ? "true" : undefined}
            >
              <FieldLabel htmlFor="permission-schedule">Jornada*</FieldLabel>
              <ComboboxField
                id="permission-schedule"
                value={permissionDraft.workScheduleId}
                onValueChange={(value) =>
                  setPermissionDraft((prev) => ({ ...prev, workScheduleId: value ?? null }))
                }
                items={toSelectItemsMap(workScheduleItems)}
              >
                <ComboboxFieldTrigger aria-invalid={Boolean(permissionErrors["workScheduleId"])}>
                  <ComboboxFieldValue placeholder="Seleccionar" />
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {workScheduleItems.map((item) => (
                    <ComboboxFieldItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxFieldItem>
                  ))}
                </ComboboxFieldContent>
              </ComboboxField>
              <div className="min-h-5">
                <FieldError>{permissionErrors["workScheduleId"]}</FieldError>
              </div>
            </Field>

            <Field
              orientation="vertical"
              variant="outlined"
              className="min-w-56 grow basis-[calc(20%-1rem)]"
              data-invalid={permissionErrors["status"] ? "true" : undefined}
            >
              <FieldLabel htmlFor="permission-status">Estado*</FieldLabel>
              <Select
                id="permission-status"
                value={permissionDraft.status}
                onValueChange={(value) =>
                  setPermissionDraft((prev) => ({
                    ...prev,
                    status: (value ?? "") as PermissionStatus | "",
                  }))
                }
                items={permissionStatusItems}
              >
                <SelectTrigger aria-invalid={Boolean(permissionErrors["status"])}>
                  <SelectValue placeholder="Seleccionar">
                    {(value) => {
                      const badge = PERMISSION_STATUS_BADGE[value as PermissionStatus]
                      if (!badge) return "Seleccionar"
                      const label =
                        permissionStatusItems.find((item) => item.value === value)?.label ?? value
                      return (
                        <Badge {...badge} className="text-xs">
                          {label}
                        </Badge>
                      )
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {permissionStatusItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="min-h-5">
                <FieldError>{permissionErrors["status"]}</FieldError>
              </div>
            </Field>

            <div className="flex w-full flex-col gap-1.5 sm:w-auto">
              <FieldLabel className="invisible">Agregar</FieldLabel>
              <Button
                variant="fill"
                color="primary"
                onClick={addPermission}
                disabled={!permissionDraftSchema.safeParse(permissionDraft).success}
                className="w-full sm:w-auto"
              >
                <ControlPointIcon data-icon="inline-start" />
                Agregar
              </Button>
              <div className="min-h-5" />
            </div>
          </div>

          <NoticeOutlet />

          {permissions.length > 0 && (
            <Table containerClassName="max-h-[36vh] overflow-y-auto">
              <TableHeader>
                <TableRow className="hover:bg-transparent has-aria-expanded:bg-transparent">
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Orden"
                      sortKey="order"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Sede"
                      sortKey="campus"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Rol"
                      sortKey="role"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Jornada"
                      sortKey="workSchedule"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  <TableHead className="text-foreground">
                    <TableSortableHeader
                      title="Estado"
                      sortKey="status"
                      sort={permissionSort}
                      onSortChange={setPermissionSort}
                    />
                  </TableHead>
                  {PERMISSION_ACTIONS_SPACER_HEAD}
                  <TableHead className="w-px text-foreground">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPermissions.map((permission) => (
                  <TableRow
                    key={`${permission.order}-${permission.campusId}`}
                    className="group/row"
                  >
                    <TableCell className="font-medium">{permission.order}</TableCell>
                    <TableCell>{permission.campusName}</TableCell>
                    <TableCell>{permission.role.name}</TableCell>
                    <TableCell className="uppercase">{permission.workSchedule.name}</TableCell>
                    <TableCell>
                      <Badge {...PERMISSION_STATUS_BADGE[permission.status]}>
                        {permission.status === "ACTIVE" ? "Activo" : "Suspendido"}
                      </Badge>
                    </TableCell>
                    {PERMISSION_ACTIONS_SPACER_CELL}
                    <TableCell className={PERMISSION_ACTIONS_CELL_CLASS}>
                      <div className="absolute inset-y-0 right-0 z-10 flex items-center gap-1 px-2 opacity-0 transition-opacity group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100">
                        <ConfirmRemoveButton
                          label={`Quitar permiso ${permission.order}`}
                          description={
                            <>
                              Se quitará el permiso de {permission.role.name} en {permission.campusName}
                              . Esta acción no se puede deshacer.
                            </>
                          }
                          onConfirm={() => removePermission(permission.order)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <DialogFooter className="justify-end sm:justify-end">
            {hasPermissionsChanges && (
              <Button
                variant="fill"
                color="primary"
                size="sm"
                onClick={() => void closePermissionsDialog()}
                disabled={isSavingPermissions}
              >
                <CheckIcon data-icon="inline-start" />
                {isSavingPermissions ? "Guardando..." : "Guardar"}
              </Button>
            )}
            <Button
              variant="fill"
              color="neutral"
              size="sm"
              onClick={() => handlePermissionsDialogOpenChange(false)}
              disabled={isSavingPermissions}
            >
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={additionalInfoDialogOpen} onOpenChange={handleAdditionalInfoDialogOpenChange}>
        <DialogContent
          className="w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] overflow-y-auto overflow-x-hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Información complementaria</DialogTitle>
          </DialogHeader>

          <NoticeOutlet />

          <EmployeeAdditionalInfoForm value={additionalInfo} onChange={setAdditionalInfo} />

          <DialogFooter className="justify-end sm:justify-end">
            {hasAdditionalInfoChanges && (
              <Button
                variant="fill"
                color="primary"
                size="sm"
                onClick={() => void closeAdditionalInfoDialog()}
                disabled={updateAdditionalInfoMutation.isPending}
              >
                <CheckIcon data-icon="inline-start" />
                {updateAdditionalInfoMutation.isPending ? "Guardando..." : "Guardar"}
              </Button>
            )}
            <Button
              variant="fill"
              color="neutral"
              size="sm"
              onClick={() => handleAdditionalInfoDialogOpenChange(false)}
              disabled={updateAdditionalInfoMutation.isPending}
            >
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
