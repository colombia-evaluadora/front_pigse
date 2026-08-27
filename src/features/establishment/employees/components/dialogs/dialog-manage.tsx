import { useEffect, useMemo, useRef, useState, type ComponentProps } from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { cn } from "@/lib/utils"
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
import type { CatalogItem } from "@/types/catalog"
import type {
  Employee,
  EmployeeStatus,
} from "@/features/establishment/employees/api/types/employee"
import {
  PERMISSION_STATUS_OPTIONS,
  type Permission,
  type PermissionStatus,
} from "@/features/establishment/institution/api/types/permission"
import {
  personDataChangedSinceMatch,
  type Person,
} from "@/features/establishment/employees/api/types/person"
import { passwordRules } from "@/features/auth/api/schema"
import {
  createAdditionalInfoFromEmployee,
  EmployeeAdditionalInfoForm,
  type EmployeeAdditionalInfoValue,
} from "@/features/establishment/employees/components/forms/form-sections/employee-additional-info-section"
import { UserDetailsForm } from "@/features/establishment/employees/components/forms/form-sections/user-details-section"
import { NoticeOutlet, useNotify } from "@/components/notice/notice-context"

interface ManageEmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: number | null
}

interface PermissionDraft {
  order: string
  roleId: number | null
  workScheduleId: number | null
  status: PermissionStatus | ""
}

/**
 * Los cuatro campos del permiso son obligatorios (llevan asterisco). El orden
 * llega como texto del `input[type=number]`, así que se valida como texto y se
 * convierte aparte: un `number` vacío llega como `NaN` y el mensaje sería el
 * de tipo, no el de "falta el dato".
 */
const permissionDraftSchema = z.object({
  order: z
    .string()
    .trim()
    .min(1, "Ingresa el orden.")
    .refine((value) => Number.isInteger(Number(value)) && Number(value) > 0, {
      message: "El orden debe ser un número entero mayor que cero.",
    }),
  // `custom` y no `number`: al validar que no es `null`, el resultado ya sale
  // tipado como `number` y el permiso se arma sin castear.
  roleId: z.custom<number>((value) => typeof value === "number", {
    message: "Selecciona el rol.",
  }),
  workScheduleId: z.custom<number>((value) => typeof value === "number", {
    message: "Selecciona la jornada.",
  }),
  // `custom` y no `string`: al validar que no está vacío, el resultado ya sale
  // tipado como `PermissionStatus` y el permiso se arma sin castear.
  status: z.custom<PermissionStatus>((value) => typeof value === "string" && value !== "", {
    message: "Selecciona el estado.",
  }),
})

/**
 * ¿La información complementaria trae algo? Se usa al abrir el diálogo en modo
 * edición: si el funcionario ya llega con estos datos del backend, la sección
 * cuenta como guardada.
 */
function hasAdditionalInfoData(value: EmployeeAdditionalInfoValue): boolean {
  return Boolean(
    value.address.trim() ||
    value.employeeClass?.id ||
    value.educationLevel?.id ||
    value.grade?.id ||
    value.highestEducationLevel?.id ||
    value.fundingSource?.id ||
    value.functionalPosition?.id ||
    value.employmentType?.id,
  )
}

/**
 * Badge por estado del permiso, con el mismo criterio que los estados de
 * periodo académico: `soft` y el color según la carga del estado. Lo consumen
 * el select del formulario y la columna Estado de la tabla, para que el mismo
 * dato no se pinte de dos maneras distintas en el mismo diálogo.
 */
const PERMISSION_STATUS_BADGE: Record<
  PermissionStatus,
  Pick<ComponentProps<typeof Badge>, "variant" | "color">
> = {
  ACTIVE: { variant: "soft", color: "success" },
  SUSPENDED: { variant: "soft", color: "destructive" },
}

/** Columnas por las que se puede ordenar la tabla de permisos. */
type PermissionSortKey = "order" | "role" | "workSchedule" | "status"

/** El valor plano por el que ordena cada columna (los catálogos son objetos). */
function permissionSortValue(permission: Permission, key: PermissionSortKey): unknown {
  switch (key) {
    case "order":
      return permission.order
    case "role":
      return permission.role.name
    case "workSchedule":
      return permission.workSchedule.name
    case "status":
      return permission.status
  }
}

/*
 * Columna de acciones al estilo de `DataTable` y de la tabla de escalas de
 * valoración: la celda es `sticky` y de 1px —los botones son absolutos, su
 * min-content es 0— y el `spacer` que va justo antes es quien le reserva el
 * ancho en el flujo, para que no se lleve una tajada del reparto.
 */
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

/*
 * El bloque va a sangre contra el borde derecho, con el alto completo de la
 * fila, y aparece con el mismo fade que el hover. El fondo es el color del
 * hover de `TableRow` (`bg-muted/50`) ya resuelto: acá hace falta opaco porque
 * tapa las columnas que pasan por debajo al scrollear, y se mezcla contra
 * `--popover` —la tabla vive dentro de un Dialog—.
 */
const permissionActionsOverlayClass = () =>
  cn(
    "absolute inset-y-0 right-0 z-10 flex items-center gap-1 px-2 transition-opacity",
    "bg-[color-mix(in_srgb,var(--muted)_50%,var(--popover))]",
    "opacity-0 group-hover/row:opacity-100 group-has-[:focus-visible]/row:opacity-100",
  )

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

function isBlankValue(value: string | null | undefined): boolean {
  return value == null || value.trim() === ""
}

/**
 * Datos mínimos para dar de alta a la persona: los cuatro con asterisco, más
 * correo, género y contraseña — no llevan asterisco en el formulario
 * (`UserDetailsForm` lo comparte con otras pantallas donde son opcionales),
 * pero acá son obligatorios de verdad: `/register/funcionario`
 * (`RegisterUsuarioRequest`, auth-center) y `fn_usu_crear` (SQL) los exigen
 * — correo/contraseña son la cuenta y el login del funcionario, y género
 * (REV: se había sacado, el negocio volvió a pedirlo) nunca dejó de ser
 * `@NotNull`/obligatorio en el backend, esto solo estaba desalineado del
 * lado del front. Fecha de nacimiento, en cambio, sigue sin validarse acá:
 * es columna nullable de verdad. Las rutas coinciden con las que
 * `UserDetailsForm` usa para ubicar el mensaje debajo de cada campo, por
 * eso van prefijadas con `employee`.
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

    // Mismas reglas de fortaleza que el password de restablecer/crear
    // cuenta en auth (`passwordRules`) y que rector/secretaria en
    // `institution/utils/validate-form.ts` — ver ese archivo para el
    // detalle de cada regla.
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

    // Persona SIN `id` todavía: va a `POST /register/funcionario`, que
    // exige `@NotBlank` en email/password (mismo criterio que rector/
    // secretaria en `makePersonSchema`, ver ese archivo). Persona CON `id`
    // va a PUT (tolera estos campos vacíos, nunca resetea la contraseña),
    // así que acá solo se exigen al crear.
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

    // `accountExists`: el autocompletado por documento confirmó que sigue
    // siendo la misma cuenta y puso el valor decorativo con el campo
    // bloqueado — no es una contraseña real que haya que validar.
    if (person.accountExists) {
      return
    }

    // Persona existente editando password: solo se valida si escribió algo
    // (en cualquiera de los dos campos) — igual que rector/secretaria.
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

function createPermissionDraft(nextOrder = 1): PermissionDraft {
  return {
    order: String(nextOrder),
    roleId: null,
    workScheduleId: null,
    status: "",
  }
}

function buildEmployeeStatus(permissions: Permission[]): EmployeeStatus {
  return permissions.some((permission) => permission.status === "ACTIVE") ? "ACTIVE" : "SUSPENDED"
}

export function ManageEmployeeDialog({
  open,
  onOpenChange,
  employeeId,
}: ManageEmployeeDialogProps) {
  const { notify } = useNotify()
  const isEditMode = Boolean(employeeId)
  /**
   * id del empleado recién creado en esta sesión. Mientras está vacío no
   * se han hecho llamadas a POST/PUT /employees; cuando se llena, el diálogo
   * habilita los botones opcionales (permisos / información complementaria)
   * y `handleMainSave` pasa a usar PUT /employees/:id.
   */
  const [createdEmployeeId, setCreatedEmployeeId] = useState<number | null>(null)

  const [person, setPerson] = useState<Person | null>(createEmptyPerson())
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [additionalInfo, setAdditionalInfo] = useState<EmployeeAdditionalInfoValue>(
    createInitialAdditionalInfo,
  )

  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false)
  const [additionalInfoDialogOpen, setAdditionalInfoDialogOpen] = useState(false)
  const [permissionDraft, setPermissionDraft] = useState<PermissionDraft>(createPermissionDraft)
  // Mensaje por campo del borrador de permiso, indexado por su nombre.
  const [permissionErrors, setPermissionErrors] = useState<Record<string, string>>({})
  // Ídem para los datos de la persona, con las rutas de `UserDetailsForm`.
  const [personErrors, setPersonErrors] = useState<Record<string, string>>({})
  // Orden de la tabla de permisos: estado local, la tabla se arma a mano.
  const [permissionSort, setPermissionSort] = useState<TableSort<PermissionSortKey>>(null)
  /*
   * Secciones opcionales ya confirmadas con su botón Guardar. Es lo que decide
   * qué botón se ve y con qué ícono, y va aparte de los datos a propósito:
   * agregar una fila a la tabla —o escribir en el formulario— todavía no
   * cuenta, recién el Guardar del diálogo lo hace. Cancelar deja el estado
   * como estaba.
   */
  const [permissionsSaved, setPermissionsSaved] = useState(false)
  const [additionalInfoSaved, setAdditionalInfoSaved] = useState(false)
  // Estado UI: vive fuera de `Person` porque no es parte del modelo de negocio.
  const [confirmPassword, setConfirmPassword] = useState("")
  // Foto elegida en el form, todavía sin subir: viaja como `fkTarchivoFoto`
  // del multipart, tanto en el alta (/register/funcionario) como en el PATCH.
  const [photo, setPhoto] = useState<File | null>(null)
  // PK_TFUNCIONARIO que devolvió el autocompletado por documento cuando la
  // persona YA es funcionario activo (`fn_fun_activo_por_usuario`, V51 REV5
  // — ver `use-user-by-document.ts`). Dispara el efecto de abajo, que carga
  // el registro completo y trata el resto del diálogo como edición desde
  // ya (habilita Permisos/Información complementaria sin esperar al primer
  // Guardar) — con TFUNCIONARIO como una fila por persona, si ya existe uno
  // activo, dar de alta ES editarlo, sea cual sea el establecimiento en el
  // que se lo esté buscando.
  const [matchedFuncionarioId, setMatchedFuncionarioId] = useState<number | null>(null)
  // Snapshot crudo del autocompletado (antes del placeholder de
  // contraseña) cuando SÍ existe la cuenta pero todavía NO hay
  // TFUNCIONARIO (`matchedFuncionarioId` se queda en null en ese caso).
  // `fn_fun_crear` reusa el TUSUARIO tal cual estaba: si el usuario corrige
  // algo del form antes de guardar, `handleMainSave` compara contra esto
  // para saber si hace falta encadenar un PATCH además del alta (ver
  // `personDataChangedSinceMatch`).
  const personMatchSnapshotRef = useRef<Partial<Person> | null>(null)
  // Snapshot de los `id` (PK_TSEDE_USUARIO) que ya existían al abrir/cargar
  // el diálogo. Real-mode-only: el guardado de permisos compara `permissions`
  // contra este set para armar el diff crear/eliminar que espera
  // PUT /funcionario/:ID/permisos — ver closePermissionsDialog.
  const originalPermissionIdsRef = useRef<Set<number>>(new Set())
  const [isSavingPermissions, setIsSavingPermissions] = useState(false)

  const sortedPermissions = useMemo(() => {
    if (!permissionSort) return permissions
    const { key, dir } = permissionSort
    const sorted = [...permissions].sort((a, b) =>
      compareBySortKey(permissionSortValue(a, key), permissionSortValue(b, key)),
    )
    return dir === "desc" ? sorted.reverse() : sorted
  }, [permissions, permissionSort])

  /**
   * id efectivo del empleado: el de la URL en edición, o el recién creado
   * durante esta sesión del diálogo. Mientras sea null, significa que la
   * persona todavía no está enlazada a un empleado.
   */
  const activeEmployeeId = isEditMode ? (employeeId ?? null) : createdEmployeeId
  const canOpenOptionalSections = Boolean(activeEmployeeId)

  const employeeQuery = useEmployeeQuery(employeeId ?? null, open && isEditMode)
  const { data: roles = [] } = useEmployeeRolesQuery()
  const { data: workSchedules = [] } = useCatalogQuery<CatalogItem>(CATALOGS.WORK_SCHEDULES)
  const roleItems = toSelectOptions(roles)
  const workScheduleItems = toSelectOptions(workSchedules)
  // Estado del permiso: dominio fijo (TSEDE_USUARIO.TLV_ESTADO, no un
  // catálogo real), value por `.code` a propósito — ver
  // PERMISSION_STATUS_OPTIONS en institution/api/types/permission.ts.
  const permissionStatusItems = PERMISSION_STATUS_OPTIONS.map((status) => ({
    value: status.code,
    label: status.name,
  }))

  // Revalida en cada cambio tras un intento de guardar fallido, para que el
  // borde rojo desaparezca apenas el campo queda completo.
  useEffect(() => {
    if (Object.keys(personErrors).length === 0) return
    setPersonErrors(computePersonErrors(person, confirmPassword, photo))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `personErrors` es guard, no dep.
  }, [person, confirmPassword, photo])

  /**
   * Vuelca un `Employee` completo sobre todo el estado del diálogo — lo
   * comparten el efecto de edición normal (`employeeQuery`) y el de "ya es
   * funcionario activo" (`matchedEmployeeQuery`, ver más abajo): en ambos
   * casos el diálogo termina mostrando exactamente lo mismo, solo cambia
   * cómo se llegó al `id`.
   */
  function applyLoadedEmployee(employee: Employee) {
    setPerson(employee.person)
    setPermissions(employee.permissions)
    originalPermissionIdsRef.current = new Set(
      employee.permissions
        .map((permission) => permission.id)
        .filter((id): id is number => id !== undefined),
    )
    setAdditionalInfo(createAdditionalInfoFromEmployee(employee))
    setPermissionDraft(createPermissionDraft(employee.permissions.length + 1))
    setPermissionErrors({})
    setPersonErrors({})
    setConfirmPassword(employee.person.password)
    // La foto guardada no vuelve como `File`: se arranca sin nada elegido y
    // solo se manda si el usuario carga una nueva.
    setPhoto(null)
    // Lo que llega del backend ya está guardado: los botones arrancan con
    // el ícono de editar, sin pedir un Guardar que no aplica.
    setPermissionsSaved(employee.permissions.length > 0)
    setAdditionalInfoSaved(hasAdditionalInfoData(createAdditionalInfoFromEmployee(employee)))
  }

  useEffect(() => {
    if (!open) {
      return
    }

    if (!isEditMode) {
      setPerson(createEmptyPerson())
      setPermissions([])
      setAdditionalInfo(createInitialAdditionalInfo())
      setPermissionDraft(createPermissionDraft())
      setPermissionErrors({})
      setPersonErrors({})
      setConfirmPassword("")
      setPhoto(null)
      setCreatedEmployeeId(null)
      setPermissionsSaved(false)
      setAdditionalInfoSaved(false)
      setMatchedFuncionarioId(null)
      personMatchSnapshotRef.current = null
      originalPermissionIdsRef.current = new Set()
      return
    }

    if (employeeQuery.data?.status === "ok") {
      applyLoadedEmployee(employeeQuery.data.employee)
    }
  }, [employeeQuery.data, isEditMode, open])

  // El autocompletado por documento (`UserDetailsForm`, `onMatched` más
  // abajo) puede encontrar que la persona YA es funcionario activo
  // (`found.id`, ver `use-user-by-document.ts`/V51 REV5) — en ese caso el
  // alta se trata como edición de ese registro desde ya: se carga completo
  // y se habilitan Permisos/Información complementaria sin esperar al
  // primer Guardar (mismo criterio que pide el negocio: si ya sabemos que
  // se va a asignar permisos/editar info de alguien que ya existe, no tiene
  // sentido fingir que es un alta nueva).
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
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }

        // En modo creación este guardado final también pasa por PUT (una vez
        // ya existe `activeEmployeeId`), así que hay que distinguir el mensaje
        // acá: el funcionario se está creando por primera vez.
        notify(isEditMode ? SUCCESS_MESSAGES.employee.updated : SUCCESS_MESSAGES.employee.created)
        onOpenChange(false)
      },
      onError: (error) => {
        notify(getErrorMessage(error) || "No fue posible actualizar el funcionario.", {
          variant: "error",
        })
      },
    },
  })

  const isSavingMain =
    createPersonMutation.isPending || createMutation.isPending || updateMutation.isPending

  async function handleMainSave() {
    const draft = person as Person | null

    if (!draft) {
      notify("No hay datos del usuario para guardar.", { variant: "error" })
      return
    }

    // 1) Garantizar que la persona exista (POST /person en mock;
    //    POST /register/funcionario en real — ver más abajo, ese además
    //    ya crea el TFUNCIONARIO, así que el flujo real se bifurca acá).
    let persistedPerson = draft

    const nextErrors = computePersonErrors(persistedPerson, confirmPassword, photo)

    if (Object.keys(nextErrors).length > 0) {
      setPersonErrors(nextErrors)
      return
    }

    if (!persistedPerson.id) {
      setPersonErrors({})

      if (!env.ENABLE_API_MOCKING && !activeEmployeeId) {
        // Backend real: /register/funcionario (auth-center, Java) crea
        // TUSUARIO + TFUNCIONARIO (`fn_fun_crear` reusa el TUSUARIO si
        // `accountExists` era `true`). TFUNCIONARIO ya no es una fila por
        // establecimiento, así que no hace falta indicar a cuál pertenece
        // ni enlazarlo después — el select de EE y el paso de "enlazar"
        // (`fn_fun_enlazar_establecimiento`) quedaron obsoletos con este
        // cambio de modelo (ver V51 REV5).
        try {
          const registered = await registerFuncionario(persistedPerson, photo)
          persistedPerson = { ...persistedPerson, id: registered.pkFuncionario }

          // `fn_fun_crear` reusó el TUSUARIO tal cual estaba cuando
          // `accountExists` era `true` — si el usuario corrigió algo del
          // form respecto a lo que trajo el autocompletado antes de
          // guardar, esa corrección todavía no llegó al backend. Se
          // encadena un PATCH aparte solo si de verdad cambió algo.
          const snapshot = personMatchSnapshotRef.current
          if (snapshot && personDataChangedSinceMatch(snapshot, persistedPerson)) {
            await updateFuncionario(
              registered.pkFuncionario,
              {
                id: registered.pkFuncionario,
                person: persistedPerson,
                employeeClass: additionalInfo.employeeClass,
                educationLevel: additionalInfo.educationLevel,
                grade: additionalInfo.grade,
                highestEducationLevel: additionalInfo.highestEducationLevel,
                fundingSource: additionalInfo.fundingSource,
                functionalPosition: additionalInfo.functionalPosition,
                employmentType: additionalInfo.employmentType,
                address: additionalInfo.address,
                permissions,
                status: buildEmployeeStatus(permissions),
              },
              photo,
            )
          }

          setPerson(persistedPerson)
          setCreatedEmployeeId(registered.pkFuncionario)
          notify(SUCCESS_MESSAGES.employee.created)
        } catch (error) {
          notify(
            error instanceof Error ? error.message : "No fue posible registrar el funcionario.",
            {
              variant: "error",
            },
          )
        }
        return
      }

      const result = await createPersonMutation.mutateAsync(persistedPerson)

      if (result.status === "error") {
        notify(result.message, { variant: "error" })
        return
      }

      persistedPerson = result.person
      setPerson(result.person)
    }

    // 2) Garantizar que el empleado exista en employeesDb vinculado a la
    // persona. Si todavía no hay un id de empleado (primer guardado en
    // creación o nuevo ingreso durante esta sesión), llamamos POST
    // /employees con catálogos vacíos si el usuario no entró ni permisos
    // ni información complementaria. A partir de ese momento los botones
    // opcionales quedan disponibles sin cerrar el diálogo.
    // (Solo mock: en real, este paso ya lo cubrió /register/funcionario
    // arriba — no hay un POST /employees separado.)
    const payload: Employee = {
      // Sin `id` cuando todavía no existe: lo asigna el backend al crear.
      id: activeEmployeeId ?? undefined,
      person: persistedPerson,
      employeeClass: additionalInfo.employeeClass,
      educationLevel: additionalInfo.educationLevel,
      grade: additionalInfo.grade,
      highestEducationLevel: additionalInfo.highestEducationLevel,
      fundingSource: additionalInfo.fundingSource,
      functionalPosition: additionalInfo.functionalPosition,
      employmentType: additionalInfo.employmentType,
      address: additionalInfo.address,
      permissions,
      status: buildEmployeeStatus(permissions),
    }

    if (!activeEmployeeId) {
      const result = await createMutation.mutateAsync(payload)

      if (result.status === "error") {
        notify(result.message, { variant: "error" })
        return
      }

      // Fijamos el id del empleado recién creado para que las próximas
      // invocaciones a handleMainSave pasen por PUT, y habilitamos los
      // botones opcionales sin cerrar el diálogo.
      setCreatedEmployeeId(result.employee.id ?? null)
      notify(
        permissions.length === 0
          ? "Usuario guardado. Puedes asignar permisos e información complementaria."
          : "Funcionario guardado.",
      )
      return
    }

    // Empleado ya enlazado: editamos con PUT.
    await updateMutation.mutateAsync({
      employeeId: activeEmployeeId,
      values: payload,
      foto: photo,
    })
  }

  function addPermission() {
    const parsed = permissionDraftSchema.safeParse(permissionDraft)

    if (!parsed.success) {
      // Un mensaje por campo, debajo del input que hay que corregir. Se guarda
      // el primer issue de cada ruta porque ahí solo cabe una línea.
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
    const workSchedule = workSchedules.find((item) => item.id === draft.workScheduleId)

    if (!role || !workSchedule) {
      notify("No fue posible resolver los datos del permiso seleccionado.", { variant: "error" })
      return
    }

    const nextPermission: Permission = {
      order: Number(draft.order),
      role,
      workSchedule,
      status: draft.status,
    }

    setPermissions((current) => [...current, nextPermission])
    setPermissionDraft(createPermissionDraft(permissions.length + 2))
    notify(`Permiso de ${role.name} agregado.`)
  }

  function removePermission(order: number) {
    // El permiso se busca antes de filtrar: después del `setPermissions` los
    // órdenes se renumeran y ya no habría con qué armar el mensaje.
    const removed = permissions.find((permission) => permission.order === order)

    setPermissions((current) =>
      current
        .filter((permission) => permission.order !== order)
        .map((permission, index) => ({ ...permission, order: index + 1 })),
    )

    notify(removed ? `Permiso de ${removed.role.name} eliminado.` : "Permiso eliminado.")
  }

  /**
   * En mock, los permisos siguen viajando embebidos en el payload general
   * del empleado (comportamiento original, sin cambios) — acá solo se
   * confirma el borrador.
   *
   * En real, este es el punto que la propia `fn_fun_permisos_actualizar`
   * espera como su único caller: `fn_fun_actualizar` ya no acepta lista de
   * permisos, así que el "Guardar" de este sub-diálogo llama directo a
   * PUT /funcionario/:ID/permisos con el diff contra
   * `originalPermissionIdsRef` — altas (permisos sin `id`, agregados en
   * este borrador) y bajas (`id`s que ya no están en `permissions`). No
   * soporta "editar" un permiso existente (mismo límite que la función
   * SQL): si alguien cambia el orden de un permiso ya persistido sin
   * agregarlo/quitarlo, ese cambio de orden no se sincroniza.
   */
  async function closePermissionsDialog() {
    if (env.ENABLE_API_MOCKING || !activeEmployeeId) {
      setPermissionsSaved(true)
      setPermissionsDialogOpen(false)
      notify("Permisos agregados al borrador. Pulsa Guardar para persistir el funcionario.", {
        variant: "info",
      })
      return
    }

    const currentIds = new Set(
      permissions.map((permission) => permission.id).filter((id): id is number => id !== undefined),
    )
    const toDelete = [...originalPermissionIdsRef.current].filter((id) => !currentIds.has(id))
    const toCreate = permissions.filter((permission) => permission.id === undefined)

    if (toDelete.length === 0 && toCreate.length === 0) {
      setPermissionsSaved(true)
      setPermissionsDialogOpen(false)
      return
    }

    setIsSavingPermissions(true)
    try {
      const items: PermissionSyncItem[] = [
        ...toDelete.map((id): PermissionSyncItem => ({ accion: "eliminar", id })),
        ...toCreate.map(toCrearItem),
      ]
      const results = await updateEmployeePermissions(activeEmployeeId, items)

      // Los `id` que la BD asignó a las altas vuelven en el mismo orden en
      // que se mandaron los "crear" — se emparejan por posición para que el
      // borrador ya quede con `id` y no se re-manden como altas la próxima
      // vez que se abra "Guardar".
      const createdIds = results.filter((row) => row.accion === "crear").map((row) => row.id)
      let createdIndex = 0
      setPermissions((current) =>
        current.map((permission) => {
          if (permission.id !== undefined) return permission
          const id = createdIds[createdIndex]
          createdIndex += 1
          return id === undefined ? permission : { ...permission, id }
        }),
      )
      originalPermissionIdsRef.current = new Set([...currentIds, ...createdIds])

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

  function closeAdditionalInfoDialog() {
    setAdditionalInfoSaved(true)
    setAdditionalInfoDialogOpen(false)
    notify(
      "Información complementaria agregada al borrador. Pulsa Guardar para persistir el funcionario.",
      { variant: "info" },
    )
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
            onMatched={(found) => {
              if (found?.id) {
                // Ya es funcionario activo -- el efecto de arriba
                // (`matchedEmployeeQuery`) lo carga completo y trata el
                // resto del diálogo como edición.
                setMatchedFuncionarioId(found.id)
                personMatchSnapshotRef.current = null
              } else {
                // Solo existe la cuenta (o no hay match): guarda el
                // snapshot para poder detectar ediciones antes de guardar
                // (ver el bloque de `personDataChangedSinceMatch` en
                // `handleMainSave`), y limpia cualquier carga anterior.
                personMatchSnapshotRef.current = found ?? null
                setMatchedFuncionarioId(null)
              }
            }}
          />

          {/* `sm:justify-between` y no solo `justify-between`: el `DialogFooter`
              trae `sm:justify-end` propio y, al ser una clase con variante,
              `twMerge` no la funde con la pelada — sin el `sm:` los dos grupos
              se iban juntos a la derecha en escritorio. */}
          <DialogFooter className="flex-row flex-wrap items-center justify-between gap-3 sm:justify-between">
            {/*
              Los dos accesos opcionales se recorren en orden: permisos primero
              y, solo cuando ya hay al menos uno, aparece la información
              complementaria. Cada botón cuenta en qué punto está con su ícono:
              el "+" en círculo de los listados (`ControlPointIcon`) mientras la
              sección está vacía, y el lápiz de las tablas cuando ya tiene datos
              —entrar deja de ser agregar y pasa a ser editar—.
            */}
            <div className="flex flex-wrap items-center gap-2">
              {canOpenOptionalSections && (
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

              {canOpenOptionalSections && permissionsSaved && (
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
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
        <DialogContent
          className="w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] overflow-y-auto overflow-x-hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Asignar permisos</DialogTitle>
          </DialogHeader>

          {/* Fila fluida: los campos crecen y bajan de línea solos, y el botón
              ocupa solo lo que mide en vez de reservar una columna entera. */}
          <div className="flex flex-wrap items-end gap-4">
            <Field
              orientation="vertical"
              variant="outlined"
              className="min-w-56 grow basis-[calc(33%-1rem)]"
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
              {/* `min-h-5` reserva el alto de una línea de error aunque no
                  haya mensaje: sin esto, los campos sin error quedaban más
                  bajos que los campos vecinos con error (la fila usa
                  `items-end`, así que un campo más corto se corre hacia
                  abajo para alinear su base con el resto). */}
              <div className="min-h-5">
                <FieldError>{permissionErrors["order"]}</FieldError>
              </div>
            </Field>

            <Field
              orientation="vertical"
              variant="outlined"
              className="min-w-56 grow basis-[calc(33%-1rem)]"
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
              className="min-w-56 grow basis-[calc(33%-1rem)]"
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
              className="min-w-56 grow basis-[calc(33%-1rem)]"
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
                  {/* El valor elegido se muestra como el mismo badge que la
                      columna Estado de la tabla de abajo. */}
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
                className="w-full sm:w-auto"
              >
                <ControlPointIcon data-icon="inline-start" />
                Agregar
              </Button>
              <div className="min-h-5" />
            </div>
          </div>

          {/* El aviso va entre el formulario y la tabla: es la respuesta a lo
              que se acaba de hacer con los campos de arriba, y queda pegado al
              listado que cambió. */}
          <NoticeOutlet />

          {/* La tabla aparece recién con el primer permiso: vacía no aportaba
              nada más que un encabezado y una fila de "aún no hay". */}
          {permissions.length > 0 && (
            <Table containerClassName="max-h-[36vh] overflow-y-auto">
              <TableHeader>
                {/* El encabezado no lleva fondo propio ni hover: comparte el de
                    la tabla en reposo, igual que una fila sin el puntero
                    encima. `has-aria-expanded` cubre el rato en que un menú de
                    orden está abierto. */}
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
                  {/* La columna de acciones no rotula —el `th` solo reserva el
                      ancho del bloque— y el título queda para lectores. */}
                  {PERMISSION_ACTIONS_SPACER_HEAD}
                  <TableHead className="w-px text-foreground">
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPermissions.map((permission) => (
                  <TableRow key={permission.order} className="group/row">
                    <TableCell className="font-medium">{permission.order}</TableCell>
                    <TableCell>{permission.role.name}</TableCell>
                    <TableCell className="uppercase">{permission.workSchedule.name}</TableCell>
                    <TableCell>
                      <Badge {...PERMISSION_STATUS_BADGE[permission.status]}>
                        {permission.status === "ACTIVE" ? "Activo" : "Suspendido"}
                      </Badge>
                    </TableCell>
                    {PERMISSION_ACTIONS_SPACER_CELL}
                    <TableCell className={PERMISSION_ACTIONS_CELL_CLASS}>
                      <div className={permissionActionsOverlayClass()}>
                        <ConfirmRemoveButton
                          label={`Quitar permiso ${permission.order}`}
                          description={
                            <>
                              Se quitará el permiso de {permission.role.name}. Esta acción no se
                              puede deshacer.
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
            {/* "Guardar" solo cuando hay algo que guardar: sin permisos en la
                tabla no confirma nada y competía con "Agregar", que es la
                acción real de esta pantalla. */}
            {permissions.length > 0 && (
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
              onClick={() => setPermissionsDialogOpen(false)}
              disabled={isSavingPermissions}
            >
              <XIcon data-icon="inline-start" />
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={additionalInfoDialogOpen} onOpenChange={setAdditionalInfoDialogOpen}>
        <DialogContent
          className="w-[min(95vw,56rem)] max-w-none sm:max-w-224 max-h-[85vh] overflow-y-auto overflow-x-hidden"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle>Información complementaria</DialogTitle>
          </DialogHeader>

          <NoticeOutlet className="mb-2" />

          <EmployeeAdditionalInfoForm value={additionalInfo} onChange={setAdditionalInfo} />

          <DialogFooter className="justify-end sm:justify-end">
            <Button variant="fill" color="primary" size="sm" onClick={closeAdditionalInfoDialog}>
              <CheckIcon data-icon="inline-start" />
              Guardar
            </Button>
            <Button
              variant="fill"
              color="neutral"
              size="sm"
              onClick={() => setAdditionalInfoDialogOpen(false)}
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
