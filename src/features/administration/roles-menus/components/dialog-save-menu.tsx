import { useEffect, useRef, useState } from "react"
import { z } from "zod"

import { useNotify } from "@/components/notice/notice-context"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon, SpinnerIcon } from "@/components/ui/icons"
import { ConfirmRemoveButton } from "@/components/confirm-remove-button"
import { Input } from "@/components/ui/input"
import {
  ComboboxField,
  ComboboxFieldContent,
  ComboboxFieldItem,
  ComboboxFieldTrigger,
  ComboboxFieldValue,
  ComboboxSeparator,
} from "@/components/ui/combobox"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"

import { useDeleteMenu } from "@/features/administration/roles-menus/api/mutations/delete-menu"
import { useSaveMenu } from "@/features/administration/roles-menus/api/mutations/save-menu"
import {
  useCreatePlan,
  usePlansQuery,
} from "@/features/administration/roles-menus/api/query/use-plans-query"
import type {
  MenuNode,
  MenuTreeNode,
} from "@/features/administration/roles-menus/api/types/role-menu"

// Los `value` de un select son strings y el vacío significa "sin elegir", así
// que "menú principal" (sin padre) necesita su propio valor.
const ROOT = "root"

// Los íconos que puede llevar un menú principal. El backend los guarda por
// nombre (misma convención que `getNavIcon` resuelve), así que la lista es de
// strings y no de componentes.
const MENU_ICONS = [
  { value: "Book-Open-Icon", label: "Libro" },
  { value: "Graduation-Cap-Icon", label: "Académico" },
  { value: "Users-Icon", label: "Usuarios" },
  { value: "Admin-Panel-Settings-Icon", label: "Administración" },
  { value: "Bank-Icon", label: "Institución" },
  { value: "House-Icon", label: "Inicio" },
  { value: "Calendar-Icon", label: "Calendario" },
  { value: "Clipboard-Text-Icon", label: "Formularios" },
  { value: "Chart-Line-Up-Icon", label: "Reportes" },
  { value: "Identification-Card-Icon", label: "Identificación" },
  { value: "Map-Trifold-Icon", label: "Mapa" },
  { value: "Gear-Icon", label: "Configuración" },
] as const

interface Draft {
  key: number
  /** Presente = submenú que YA existe: se guarda con PATCH, no como alta. */
  id?: number
  name: string
  path: string
  visible: boolean
  planId: string
}

function emptyDraft(key: number): Draft {
  return { key, name: "", path: "", visible: true, planId: "" }
}

/** Submenú existente, tal como se carga en la tabla al editar su carpeta. */
function draftFromMenu(child: MenuNode, key: number): Draft {
  return {
    key,
    id: child.id,
    name: child.name,
    path: child.path ?? "",
    visible: child.visible ?? true,
    planId: child.planId != null ? String(child.planId) : "",
  }
}

/**
 * Si la fila quedó igual que el menú del que salió. Editar una carpeta no
 * tiene por qué disparar un PATCH por cada hijo que nadie tocó.
 */
function isUnchanged(draft: Draft, child: MenuNode) {
  return (
    draft.name === child.name &&
    draft.path === (child.path ?? "") &&
    draft.visible === (child.visible ?? true) &&
    draft.planId === (child.planId != null ? String(child.planId) : "")
  )
}

/**
 * Select de plan con alta al pie, igual que el de roles: crear un plan es
 * parte del mismo flujo y mandar al usuario a otra pantalla lo cortaría.
 */
function PlanSelect({
  id,
  value,
  onChange,
}: {
  /** Presente cuando el select va dentro de un `Field` con etiqueta propia. */
  id?: string
  value: string
  onChange: (planId: string) => void
}) {
  const { data: plans = [] } = usePlansQuery()
  const [newPlanName, setNewPlanName] = useState("")
  const createPlan = useCreatePlan({
    mutationConfig: {
      onSuccess: (plan) => {
        setNewPlanName("")
        onChange(String(plan.id))
      },
    },
  })
  const planError = createPlan.error ? getErrorMessage(createPlan.error) : null

  return (
    <Select value={value} onValueChange={(next) => next && onChange(String(next))}>
      <SelectTrigger id={id} variant="outlined" aria-label="Plan">
        <SelectValue>
          {(current) => plans.find((plan) => String(plan.id) === current)?.name ?? "Seleccione"}
        </SelectValue>
      </SelectTrigger>
      {/* El popup no se ata al ancho del trigger: la columna Plan es angosta y
          ahí no entra el campo de alta con su botón. */}
      <SelectContent className="w-auto min-w-72">
        <SelectGroup>
          {plans.map((plan) => (
            <SelectItem key={plan.id} value={String(plan.id)}>
              {plan.name}
            </SelectItem>
          ))}
        </SelectGroup>
        <div
          className="flex items-center gap-2 border-t border-border p-2"
          onKeyDown={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Input
            variant="outlined"
            aria-label="Nombre del nuevo plan"
            placeholder="Agregar"
            className="h-10"
            value={newPlanName}
            onChange={(event) => setNewPlanName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                createPlan.mutate({ name: newPlanName })
              }
            }}
          />
          <Button
            type="button"
            size="icon"
            disabled={newPlanName.trim().length === 0 || createPlan.isPending}
            onClick={() => createPlan.mutate({ name: newPlanName })}
          >
            <span className="sr-only">Crear plan</span>
            <ControlPointIcon />
          </Button>
        </div>
        {planError && (
          <p role="alert" className="text-destructive px-2 pb-2 text-xs">
            {planError}
          </p>
        )}
      </SelectContent>
    </Select>
  )
}

/** Los campos con asterisco del menú principal nuevo. */
const newRootSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del menú."),
  icon: z.string().trim().min(1, "Elige un ícono."),
})

/** En edición el menú ya tiene ícono y lo que se corrige es nombre y ruta. */
const editMenuSchema = z.object({
  name: z.string().trim().min(1, "Ingresa el nombre del menú."),
  path: z.string().trim().min(1, "Ingresa la ruta del menú."),
})

interface DialogSaveMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Menús raíz: los candidatos a padre. */
  roots: MenuTreeNode[]
  /**
   * Presente = edición de ese menú; ausente = alta. Al editar una carpeta llega
   * el nodo del árbol —con sus `children`—, que es lo que la tabla de submenús
   * necesita para mostrar los que ya existen.
   */
  menu?: MenuNode | MenuTreeNode
}

/**
 * Alta y edición de menús.
 *
 * En alta el diálogo hace dos cosas a la vez, que es como se usa: Eliges el
 * menú padre —o "Crear nuevo menú principal", y ahí pedimos sus datos— y
 * cargas de una varios submenús. En edición se muestra solo el menú elegido.
 */
export function DialogSaveMenu({ open, onOpenChange, roots, menu }: DialogSaveMenuProps) {
  const isEditing = menu != null
  const { notify } = useNotify()

  // Arranca sin elegir: en alta, el menú padre es la primera decisión y de ella
  // depende qué campos tienen sentido, así que el resto del formulario no
  // aparece hasta contestarla.
  const [parent, setParent] = useState<string>("")
  const [name, setName] = useState("")
  const [path, setPath] = useState("")
  const [icon, setIcon] = useState("")
  const [visible, setVisible] = useState(true)
  const [planId, setPlanId] = useState("")
  const [drafts, setDrafts] = useState<Draft[]>([])
  // `key` de React de cada fila de la tabla de submenús (los nuevos no tienen
  // `id` todavía). Contador por instancia del diálogo — solo tiene que ser
  // único dentro de `drafts` — en lugar de una variable de módulo. Se pide
  // FUERA de los updaters de `setDrafts`: StrictMode los invoca dos veces.
  const draftKeyRef = useRef(0)
  function nextDraftKey() {
    draftKeyRef.current += 1
    return draftKeyRef.current
  }
  // Mensaje por campo del menú raíz, indexado por su nombre en el esquema.
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    // En edición el padre ya está definido; en alta se elige.
    setParent(menu == null ? "" : menu.idParent != null ? String(menu.idParent) : ROOT)
    setName(menu?.name ?? "")
    setPath(menu?.path ?? "")
    setIcon(menu?.icon ?? "")
    // Los menús viejos no traen `visible`: se asumen visibles.
    setVisible(menu?.visible ?? true)
    setPlanId(menu?.planId != null ? String(menu.planId) : "")
    // Al editar una carpeta, sus submenús se cargan en la tabla: son parte de
    // lo que se está editando. En alta la tabla arranca vacía.
    setDrafts(
      menu != null && menu.idParent == null && "children" in menu
        ? menu.children.map((child) => draftFromMenu(child, nextDraftKey()))
        : [],
    )
    setFieldErrors({})
    setSaveError(null)
  }, [open, menu])

  const [saveError, setSaveError] = useState<string | null>(null)
  const saveMenu = useSaveMenu()
  const deleteMenu = useDeleteMenu({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") setSaveError(result.message)
      },
      onError: (error) => setSaveError(getErrorMessage(error)),
    },
  })

  /** Los submenús que la carpeta ya tenía al abrir el diálogo. */
  const existingChildren = menu != null && "children" in menu ? menu.children : []

  // Un menú no puede colgar de sí mismo.
  const parentOptions = roots.filter((root) => root.id !== menu?.id)
  const isNewRoot = parent === ROOT
  const hasParentChoice = parent !== ""
  const idParent = isNewRoot ? null : Number(parent)

  /*
   * Un menú principal es una CARPETA y se edita como tal: nombre, ícono y
   * visibilidad, más los submenús que cuelgan de ella. No lleva ruta propia
   * —la hereda del primer submenú— ni plan, que es cosa de cada ítem. Un
   * submenú, en cambio, sí tiene ruta y plan y no tiene ícono (el del sidebar
   * es el de su carpeta).
   */
  // `== null` y no `=== null`: un menú principal puede llegar con `idParent`
  // ausente en vez de nulo, y ahí dejaría de reconocerse como carpeta.
  const isRootMenu = isEditing ? menu.idParent == null : isNewRoot
  // La sección de submenús: al dar de alta, apenas se elige el padre; al
  // editar, solo si lo que se edita es una carpeta —a un ítem no le cuelga nada—.
  const showSubmenus = isEditing ? isRootMenu : hasParentChoice

  const filledDrafts = drafts.filter(
    (draft) => draft.name.trim().length > 0 && draft.path.trim().length > 0,
  )
  /*
   * Nombre y ruta ya no bloquean el botón: se validan al guardar y el motivo
   * aparece debajo del campo, como en el resto de los formularios. Un botón
   * deshabilitado no explica qué falta.
   *
   * Lo que sí lo bloquea es la única regla que no cuelga de un campo: colgando
   * de un menú existente hay que haber cargado al menos un submenú. Y sin menú
   * padre elegido todavía no hay nada que guardar.
   */
  const canSave = isEditing || (hasParentChoice && (isNewRoot || filledDrafts.length > 0))

  function updateDraft(key: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))
  }

  /**
   * Quitar una fila. La que todavía no se guardó sale del formulario y ya; la
   * que ya existe es un menú de verdad, así que se da de baja en el backend —el
   * botón pide confirmación antes de llegar acá—.
   */
  function removeDraft(draft: Draft) {
    if (draft.id != null) deleteMenu.mutate({ id: draft.id })
    setDrafts((prev) => prev.filter((it) => it.key !== draft.key))
  }

  async function handleSubmit() {
    // Los datos del menú principal solo se piden cuando sus campos están a la
    // vista: colgando de un menú existente, esos datos los aportan los submenús.
    if (isNewRoot || isEditing) {
      // La carpeta pide nombre e ícono; el ítem, nombre y ruta.
      const parsed = isRootMenu
        ? newRootSchema.safeParse({ name, icon })
        : editMenuSchema.safeParse({ name, path })

      if (!parsed.success) {
        const nextErrors: Record<string, string> = {}
        for (const issue of parsed.error.issues) {
          nextErrors[issue.path.join(".")] ??= issue.message
        }
        setFieldErrors(nextErrors)
        return
      }
    }

    setFieldErrors({})
    setSaveError(null)

    try {
      if (isEditing) {
        await saveMenu.mutateAsync({
          id: menu.id,
          name,
          // La carpeta conserva su ruta heredada; el ícono, en cambio, es suyo
          // y se edita. En el ítem es al revés.
          path: isRootMenu ? path || filledDrafts[0]?.path || "" : path,
          icon: isRootMenu ? icon : (menu.icon ?? ""),
          idParent,
          visible,
          // `planId` se omite en la carpeta —no tiene el campo—: mandarlo en
          // `null` le borraría el plan que pudiera tener.
          ...(isRootMenu ? {} : { planId: planId ? Number(planId) : null }),
        })
        // Submenús de la carpeta: los que ya existían se editan (llevan `id`) y
        // los agregados acá se dan de alta. Los que nadie tocó no se mandan.
        for (const draft of filledDrafts) {
          const original = existingChildren.find((child) => child.id === draft.id)
          if (original && isUnchanged(draft, original)) continue
          await saveMenu.mutateAsync({
            id: draft.id,
            name: draft.name,
            path: draft.path,
            icon: "",
            idParent: menu.id,
            visible: draft.visible,
            planId: draft.planId ? Number(draft.planId) : null,
          })
        }
      } else {
        // El padre primero: los submenús necesitan su id. Un menú principal no
        // tiene ruta propia —es un grupo—, así que hereda la del primer
        // submenú, que es a donde lleva al abrirlo.
        const parentId = isNewRoot
          ? (
              await saveMenu.mutateAsync({
                name,
                path: filledDrafts[0]?.path ?? "",
                icon,
                idParent: null,
                visible,
              })
            ).id
          : idParent
        for (const draft of filledDrafts) {
          await saveMenu.mutateAsync({
            name: draft.name,
            path: draft.path,
            icon: "",
            idParent: parentId,
            visible: draft.visible,
            planId: draft.planId ? Number(draft.planId) : null,
          })
        }
      }
      onOpenChange(false)
      notify(isEditing ? "El menú se actualizó correctamente." : "El menú se creó correctamente.")
    } catch (error) {
      // El NoticeProvider apaga el toast global: el error va al banner del diálogo.
      setSaveError(getErrorMessage(error))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mientras la única pregunta es el menú padre, el diálogo se queda del
          ancho de esa pregunta; recién al contestarla aparecen los submenús,
          que sí necesitan las cinco columnas. */}
      <DialogContent
        className={cn(
          "flex max-h-[85vh] flex-col overflow-hidden p-0",
          hasParentChoice ? "sm:max-w-2xl" : "sm:max-w-sm",
        )}
        // La X solo se oculta cuando el footer con "Cancelar" ya está
        // visible (`hasParentChoice`, ver el `DialogFooter` condicional más
        // abajo) -- sin menú padre elegido todavía no hay footer, y la X
        // sigue siendo la única forma de cerrar.
        showCloseButton={!hasParentChoice}
      >
        <DialogHeader className="shrink-0 px-6 pt-6">
          <DialogTitle>{isEditing ? "Editar menú" : "Agregar menú"}</DialogTitle>
          {saveError && (
            <p role="alert" className="text-destructive text-sm">
              {saveError}
            </p>
          )}
        </DialogHeader>

        {/* Único bloque con scroll: header y footer quedan fijos afuera, con
            su propio padding -- el `DialogContent` ya no tiene padding
            propio (`p-0`), así que el scroll queda al borde REAL del
            diálogo (no flotando adentro del padding) y es este `div` el que
            aporta el `px-6` para que el contenido no toque el scrollbar.
            "Submenús" deja agregar filas sin tope (`setDrafts`), y sin el
            `max-h` de arriba el diálogo crecía sin límite y se llevaba el
            título/botones con él. */}
        <div
          className={cn(
            "scrollbar-slim min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 flex min-w-0 flex-col gap-4",
            // Sin `hasParentChoice` el `DialogFooter` de abajo no se
            // renderiza (ver más abajo) -- este `div` queda como el ÚLTIMO
            // elemento del diálogo y necesita su propio `pb-6`, o el campo
            // "Menú padre" (y su popover "Sin resultados") quedan pegados
            // al borde real de abajo, sin respiro.
            !hasParentChoice && "pb-6",
          )}
        >
          {/* Mismo tratamiento que el diálogo de escalas de valoración: sobre la
              grilla de dos columnas, el campo ocupa el ancho entero mientras es
              la única pregunta y baja a media columna cuando el diálogo crece. */}
          <div className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
            <Field variant="outlined" className={hasParentChoice ? "" : "sm:col-span-2"}>
              <FieldLabel htmlFor="menu-parent">Menú padre</FieldLabel>
              <ComboboxField value={parent} onValueChange={(value) => value && setParent(String(value))}>
                <ComboboxFieldTrigger id="menu-parent">
                  <ComboboxFieldValue>
                    {(value) =>
                      value === ROOT
                        ? "Crear nuevo menú principal"
                        : (parentOptions.find((root) => String(root.id) === value)?.name ??
                          "Seleccionar")
                    }
                  </ComboboxFieldValue>
                </ComboboxFieldTrigger>
                <ComboboxFieldContent>
                  {/* El contenido del item vive dentro de un `ItemText` en
                      display:block —para que el texto largo termine en "…"—, así
                      que el ícono necesita su propio flex o cae a la línea de
                      arriba. */}
                  <ComboboxFieldItem value={ROOT}>
                    <span className="flex items-center gap-2">
                      <ControlPointIcon />
                      Crear nuevo menú principal
                    </span>
                  </ComboboxFieldItem>
                  <ComboboxSeparator />
                  {/* Sin `ComboboxGroup`: su `p-1.5` se suma al del popup y dejaba
                      a los menús existentes indentados respecto del item de
                      arriba, que cuelga directo del popup. */}
                  {parentOptions.map((root) => {
                    const Icon = getNavIcon(root.icon)
                    return (
                      <ComboboxFieldItem key={root.id} value={String(root.id)}>
                        <span className="flex items-center gap-2">
                          <Icon />
                          <span className="truncate">{root.name}</span>
                        </span>
                      </ComboboxFieldItem>
                    )
                  })}
                </ComboboxFieldContent>
              </ComboboxField>
            </Field>
          </div>

          {/* Datos de la carpeta: al crearla y al editarla son los mismos. */}
          {isRootMenu && (
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-[1fr_10rem_10rem]">
              <Field variant="outlined" data-invalid={fieldErrors["name"] ? "true" : undefined}>
                <FieldLabel htmlFor="menu-name">Nombre del menú*</FieldLabel>
                <Input
                  id="menu-name"
                  placeholder="Agregar"
                  value={name}
                  aria-invalid={Boolean(fieldErrors["name"])}
                  onChange={(event) => setName(event.target.value)}
                />
                <FieldError>{fieldErrors["name"]}</FieldError>
              </Field>
              <Field variant="outlined" data-invalid={fieldErrors["icon"] ? "true" : undefined}>
                <FieldLabel htmlFor="menu-icon">Icono*</FieldLabel>
                <ComboboxField value={icon} onValueChange={(value) => value && setIcon(String(value))}>
                  <ComboboxFieldTrigger id="menu-icon" aria-invalid={Boolean(fieldErrors["icon"])}>
                    {/* Lo elegido se muestra con su ícono, igual que en la
                        lista: el nombre solo no dice cuál se eligió, y el ícono
                        es justamente lo que se va a ver en el sidebar. */}
                    <ComboboxFieldValue>
                      {(value) => {
                        const option = MENU_ICONS.find((it) => it.value === value)
                        if (!option) return "Seleccione"
                        const Icon = getNavIcon(option.value)
                        return (
                          <span className="flex items-center gap-2">
                            <Icon />
                            <span className="truncate">{option.label}</span>
                          </span>
                        )
                      }}
                    </ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    {MENU_ICONS.map((option) => {
                      const Icon = getNavIcon(option.value)
                      return (
                        <ComboboxFieldItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <Icon />
                            <span className="truncate">{option.label}</span>
                          </span>
                        </ComboboxFieldItem>
                      )
                    })}
                  </ComboboxFieldContent>
                </ComboboxField>
                <FieldError>{fieldErrors["icon"]}</FieldError>
              </Field>
              <Field variant="outlined">
                <FieldLabel htmlFor="menu-visible">Visible</FieldLabel>
                <ComboboxField
                  value={visible ? "si" : "no"}
                  onValueChange={(value) => value && setVisible(value === "si")}
                >
                  <ComboboxFieldTrigger id="menu-visible">
                    <ComboboxFieldValue>{(value) => (value === "no" ? "No" : "Si")}</ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxFieldItem value="si">Si</ComboboxFieldItem>
                    <ComboboxFieldItem value="no">No</ComboboxFieldItem>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
            </div>
          )}

          {/* Datos del submenú. Solo en edición: al darlo de alta se cargan en
              la tabla de abajo, que permite varios de una. */}
          {isEditing && !isRootMenu && (
            <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <Field variant="outlined" data-invalid={fieldErrors["name"] ? "true" : undefined}>
                <FieldLabel htmlFor="menu-name">Nombre*</FieldLabel>
                <Input
                  id="menu-name"
                  placeholder="Agregar"
                  value={name}
                  aria-invalid={Boolean(fieldErrors["name"])}
                  onChange={(event) => setName(event.target.value)}
                />
                <FieldError>{fieldErrors["name"]}</FieldError>
              </Field>
              <Field variant="outlined" data-invalid={fieldErrors["path"] ? "true" : undefined}>
                <FieldLabel htmlFor="menu-path">Ruta*</FieldLabel>
                <Input
                  id="menu-path"
                  placeholder="Agregar"
                  value={path}
                  aria-invalid={Boolean(fieldErrors["path"])}
                  onChange={(event) => setPath(event.target.value)}
                />
                <FieldError>{fieldErrors["path"]}</FieldError>
              </Field>
              {/* Visible y plan son propiedades del menú como cualquier otra:
                  se cargan al darlo de alta como submenú, así que editarlo
                  tiene que poder corregirlas. */}
              <Field variant="outlined">
                <FieldLabel htmlFor="menu-edit-visible">Visible</FieldLabel>
                <ComboboxField
                  value={visible ? "si" : "no"}
                  onValueChange={(value) => value && setVisible(value === "si")}
                >
                  <ComboboxFieldTrigger id="menu-edit-visible">
                    <ComboboxFieldValue>{(value) => (value === "no" ? "No" : "Si")}</ComboboxFieldValue>
                  </ComboboxFieldTrigger>
                  <ComboboxFieldContent>
                    <ComboboxFieldItem value="si">Si</ComboboxFieldItem>
                    <ComboboxFieldItem value="no">No</ComboboxFieldItem>
                  </ComboboxFieldContent>
                </ComboboxField>
              </Field>
              <Field variant="outlined">
                <FieldLabel htmlFor="menu-edit-plan">Plan</FieldLabel>
                <PlanSelect id="menu-edit-plan" value={planId} onChange={setPlanId} />
              </Field>
            </div>
          )}

          {showSubmenus && (
            <section className="rounded-lg border border-border px-4 py-2">
              <header className="flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold">Submenús</h3>
                {/* Mismo botón que el «Agregar menú» del panel de menús
                    disponibles: es la misma acción, un nivel más adentro. */}
                <Button
                  type="button"
                  size="icon-sm"
                  onClick={() => {
                    const draft = emptyDraft(nextDraftKey())
                    setDrafts((prev) => [...prev, draft])
                  }}
                >
                  <span className="sr-only">Agregar submenú</span>
                  <ControlPointIcon />
                </Button>
              </header>

              {drafts.length > 0 && (
                <div className="mt-4 overflow-x-auto">
                  {/* Un título por columna, una sola vez arriba: los controles
                      van `outlined` y el label flotante de cada celda repetía
                      el mismo texto en cada fila. Cada control conserva su
                      `aria-label` para el lector de pantalla.

                      La última columna es de ancho fijo (el del botón de
                      quitar) y no `auto`: en el encabezado esa celda es un
                      `sr-only` que no mide nada, así que con `auto` las dos
                      grillas repartían distinto y los títulos quedaban corridos
                      respecto de sus campos. */}
                  <div className="grid min-w-[34rem] grid-cols-[1fr_1fr_7rem_9rem_2.5rem] gap-2 text-sm font-semibold">
                    <span>Nombre del menú*</span>
                    <span>URL*</span>
                    <span>Visible</span>
                    <span>Plan</span>
                    <span className="sr-only">Acciones</span>
                  </div>
                  <ul className="mt-2 flex flex-col gap-2">
                    {drafts.map((draft) => (
                      <li
                        key={draft.key}
                        className="grid min-w-[34rem] grid-cols-[1fr_1fr_7rem_9rem_2.5rem] items-center gap-2"
                      >
                        <Input
                          variant="outlined"
                          aria-label="Nombre del menú"
                          placeholder="Agregar"
                          value={draft.name}
                          onChange={(event) => updateDraft(draft.key, { name: event.target.value })}
                        />
                        <Input
                          variant="outlined"
                          aria-label="URL"
                          placeholder="Agregar"
                          value={draft.path}
                          onChange={(event) => updateDraft(draft.key, { path: event.target.value })}
                        />
                        <ComboboxField
                          value={draft.visible ? "si" : "no"}
                          onValueChange={(value) =>
                            value && updateDraft(draft.key, { visible: value === "si" })
                          }
                        >
                          <ComboboxFieldTrigger variant="outlined" aria-label="Visible">
                            <ComboboxFieldValue>{(value) => (value === "no" ? "No" : "Si")}</ComboboxFieldValue>
                          </ComboboxFieldTrigger>
                          <ComboboxFieldContent>
                            <ComboboxFieldItem value="si">Si</ComboboxFieldItem>
                            <ComboboxFieldItem value="no">No</ComboboxFieldItem>
                          </ComboboxFieldContent>
                        </ComboboxField>
                        <PlanSelect
                          value={draft.planId}
                          onChange={(planId) => updateDraft(draft.key, { planId })}
                        />
                        <ConfirmRemoveButton
                          label={draft.id != null ? "Eliminar submenú" : "Quitar submenú"}
                          size="icon"
                          // La fila existente se elimina de verdad —y el borrado
                          // del backend es en cascada—, así que el aviso lo dice.
                          description={
                            draft.id != null
                              ? `Se eliminará el submenú «${draft.name}» de todos los roles que lo tengan. Esta acción no se puede deshacer.`
                              : draft.name.trim()
                                ? `Se quitará el submenú «${draft.name}». Esta acción no se puede deshacer.`
                                : "Se quitará el submenú. Esta acción no se puede deshacer."
                          }
                          onConfirm={() => removeDraft(draft)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>

        {/* Sin menú padre elegido no hay nada que guardar ni que cancelar más
            allá de la X del encabezado, así que el pie recién aparece con la
            primera respuesta. */}
        {hasParentChoice && (
          <DialogFooter className="shrink-0 px-6 pb-6">
            <Button
              size="sm"
              type="button"
              disabled={!canSave || saveMenu.isPending}
              aria-busy={saveMenu.isPending}
              onClick={handleSubmit}
            >
              {saveMenu.isPending && (
                <SpinnerIcon data-icon="inline-start" className="animate-spin" />
              )}
              Guardar
            </Button>
            <DialogClose render={<Button size="sm" type="button" variant="fill" color="neutral" />}>
              Cancelar
            </DialogClose>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
