import { useEffect, useMemo, useState } from "react"

import { NoticeProvider, useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import {
  TableScreen,
  TableScreenBody,
  TableScreenHeader,
  TableScreenTitle,
  TableScreenToolbar,
} from "@/components/layout/table-screen"
import { Field, FieldLabel } from "@/components/ui/field"
import { ControlPointIcon } from "@/components/ui/icons"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { getErrorMessage } from "@/lib/api-client"

import { useCreateRole } from "@/features/administration/roles-menus/api/mutations/create-role"
import { useUpdateRoleMenus } from "@/features/administration/roles-menus/api/mutations/update-role-menus"
import { useMenusQuery } from "@/features/administration/roles-menus/api/query/use-menus-query"
import { useRoleMenusQuery } from "@/features/administration/roles-menus/api/query/use-role-menus-query"
import { useRolesQuery } from "@/features/administration/roles-menus/api/query/use-roles-query"
import {
  buildMenuTree,
  partitionKnownMenus,
  withRequiredParents,
} from "@/features/administration/roles-menus/api/types/role-menu"
import { MenuTransfer } from "@/features/administration/roles-menus/components/menu-transfer"

/**
 * El `NoticeProvider` va acá y no adentro del contenido: `useNotify` lee el
 * contexto de sus ancestros, así que montarlo en el mismo componente que lo
 * consume lo dejaría leyendo el fallback (que manda un toast suelto en vez del
 * aviso de la barra de herramientas).
 */
export function RolesMenusPage() {
  return (
    <NoticeProvider>
      <RolesMenusPageContent />
    </NoticeProvider>
  )
}

function RolesMenusPageContent() {
  const { notify } = useNotify()
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null)
  const [newRoleName, setNewRoleName] = useState("")

  const { data: roles = [], isPending: rolesPending } = useRolesQuery()
  // Sin selección explícita se edita el primer rol: la pantalla no tiene
  // estado válido "sin rol", y así no arranca vacía.
  const roleId = selectedRoleId ?? roles[0]?.id ?? null

  const { data: menus = [], isPending: menusPending } = useMenusQuery()
  const { data: roleMenus = [], isPending: assignedPending } = useRoleMenusQuery(roleId)
  const assignedIds = useMemo(() => roleMenus.map((menu) => menu.id), [roleMenus])

  const tree = useMemo(() => buildMenuTree(menus), [menus])

  const [readOnlyIds, setReadOnlyIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setReadOnlyIds(new Set(roleMenus.filter((menu) => menu.soloLectura).map((menu) => menu.id)))
  }, [roleMenus])

  const createRole = useCreateRole({
    mutationConfig: {
      onSuccess: (role) => {
        setNewRoleName("")
        // El rol nuevo queda seleccionado: se crea para configurarle los menús.
        setSelectedRoleId(role.id)
        notify("El rol se creó correctamente.")
      },
      // El NoticeProvider apaga el toast global: el error va al aviso de la página.
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  function handleCreateRole() {
    if (newRoleName.trim().length === 0) return
    createRole.mutate({ name: newRoleName })
  }

  const updateRoleMenus = useUpdateRoleMenus({
    mutationConfig: {
      onSuccess: (result) => {
        if (result.status === "error") {
          notify(result.message, { variant: "error" })
          return
        }
        notify("Los menús del rol se actualizaron correctamente.")
      },
      onError: (error) => notify(getErrorMessage(error), { variant: "error" }),
    },
  })

  function save(nextIds: number[], nextReadOnly: Set<number> = readOnlyIds) {
    if (roleId == null) return
    // Sin catálogo no hay con qué resolver la jerarquía, y todo id parecería
    // huérfano: guardar acá vaciaría el rol. No debería pasar (la pantalla no
    // monta el transfer mientras carga), pero el costo de equivocarse es alto.
    if (tree.length === 0) return

    // Los fantasmas —asignados cuyo padre fue dado de baja, así que el catálogo
    // ya no los ubica— viajaban en cada guardado y el backend rechazaba la
    // operación entera por la invariante de jerarquía. No se pueden ver ni
    // quitar desde la pantalla, así que se descartan acá y se avisa: es la
    // única forma de que el rol vuelva a ser editable.
    const { known, unknown } = partitionKnownMenus(nextIds, tree)
    if (unknown.length > 0) {
      notify(
        // Antes decía "cuyo menú padre ya no existe", y eso mandaba a buscar el
        // problema donde no estaba: el padre normalmente SÍ existe, solo que
        // dado de baja (`active = false`), así que el catálogo no lo devuelve.
        // El único hecho que esta pantalla puede afirmar es que no supo dónde
        // ubicarlos; el porqué se decide en la base.
        `Se descartaron ${unknown.length} menú(s) asignados que el catálogo ya no ubica (${unknown.join(", ")}): su menú padre está dado de baja o quedó fuera del árbol.`,
        { variant: "info" },
      )
    }

    // El backend rechaza la lista entera si trae un submenú sin su padre, y la
    // lista puede venir así desde la base. Se completa acá, en el único punto
    // por el que pasan asignar, quitar y reordenar.
    const finalIds = withRequiredParents(known, tree)
    updateRoleMenus.mutate({
      roleId,
      menus: finalIds.map((id) => ({ id, soloLectura: nextReadOnly.has(id) })),
    })
  }

  function handleAssign(ids: number[]) {
    save([...new Set([...assignedIds, ...ids])])
  }

  function handleUnassign(ids: number[]) {
    const nextReadOnly = new Set(readOnlyIds)
    ids.forEach((id) => nextReadOnly.delete(id))
    setReadOnlyIds(nextReadOnly)
    save(
      assignedIds.filter((id) => !ids.includes(id)),
      nextReadOnly,
    )
  }

  function handleToggleReadOnly(id: number, checked: boolean) {
    const nextReadOnly = new Set(readOnlyIds)
    if (checked) nextReadOnly.add(id)
    else nextReadOnly.delete(id)
    setReadOnlyIds(nextReadOnly)
    save(assignedIds, nextReadOnly)
  }

  const isLoading = rolesPending || menusPending || assignedPending

  return (
    <TableScreen>
      <TableScreenHeader>
        <TableScreenTitle description="Administra los roles del sistema y los menús a los que tiene acceso cada rol.">
          Configuración de roles y menús
        </TableScreenTitle>
        {/* El rol es el filtro de la pantalla —de él depende todo lo de
            abajo—, así que vive en la barra de herramientas, donde el resto de
            los listados pone su buscador. El `NoticeOutlet` lo monta la propia
            barra. */}
        <TableScreenToolbar>
          <Field variant="outlined" className="w-full max-w-md">
            <FieldLabel htmlFor="role">Rol</FieldLabel>
            <Select
              value={roleId != null ? String(roleId) : ""}
              onValueChange={(value) => value && setSelectedRoleId(Number(value))}
            >
              <SelectTrigger id="role" size="sm">
                <SelectValue>
                  {(value) =>
                    roles.find((role) => String(role.id) === value)?.name ?? "Seleccionar"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={String(role.id)}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {/* Alta rápida al pie de la lista: crear un rol es parte de esta
                    pantalla y no amerita salir a otro formulario. Los eventos se
                    frenan acá para que el select no los tome como navegación por
                    teclado ni cierre el desplegable al escribir. */}
                <div
                  className="flex items-center gap-2 border-t border-border p-2"
                  onKeyDown={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <Input
                    aria-label="Nombre del nuevo rol"
                    placeholder="Agregar"
                    className="h-10"
                    value={newRoleName}
                    onChange={(event) => setNewRoleName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        handleCreateRole()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    disabled={newRoleName.trim().length === 0 || createRole.isPending}
                    onClick={handleCreateRole}
                  >
                    <span className="sr-only">Crear rol</span>
                    <ControlPointIcon />
                  </Button>
                </div>
              </SelectContent>
            </Select>
          </Field>
        </TableScreenToolbar>
      </TableScreenHeader>

      <TableScreenBody>
        <div className="flex flex-col gap-6">
          {isLoading ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Skeleton className="h-80" />
              <Skeleton className="h-80" />
            </div>
          ) : (
            <MenuTransfer
              tree={tree}
              assignedIds={assignedIds}
              onAssign={handleAssign}
              onUnassign={handleUnassign}
              readOnlyIds={readOnlyIds}
              onToggleReadOnly={handleToggleReadOnly}
              disabled={updateRoleMenus.isPending}
            />
          )}
        </div>
      </TableScreenBody>
    </TableScreen>
  )
}
