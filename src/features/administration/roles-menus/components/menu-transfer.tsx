import { Fragment, useMemo, useState, type DragEvent, type ReactNode } from "react"

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CaretDownIcon,
  CaretUpIcon,
  ControlPointIcon,
  DotsSixVerticalIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
} from "@/components/ui/icons"
import { useNotify } from "@/components/notice/notice-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getNavIcon } from "@/features/navigation/api/ui-mappings"
import { getErrorMessage } from "@/lib/api-client"
import { cn } from "@/lib/utils"

import { useReorderMenus } from "@/features/administration/roles-menus/api/mutations/reorder-menus"
import type {
  MenuNode,
  MenuTreeNode,
} from "@/features/administration/roles-menus/api/types/role-menu"
import { reorderSiblings } from "@/features/administration/roles-menus/api/types/role-menu"
import { DialogDeleteMenu } from "@/features/administration/roles-menus/components/dialog-delete-menu"
import { DialogSaveMenu } from "@/features/administration/roles-menus/components/dialog-save-menu"

function SearchMenus({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="relative">
      <MagnifyingGlassIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type="search"
        variant="outlined"
        size="sm"
        autoComplete="off"
        placeholder="Buscar menú..."
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="pl-9"
      />
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 py-8 text-center text-muted-foreground">
      <FolderOpenIcon className="size-8" />
      <span className="text-sm">{message}</span>
    </div>
  )
}

function matches(node: MenuNode, query: string) {
  const q = query.trim().toLowerCase()
  return !q || node.name.toLowerCase().includes(q)
}

/** Grupo + sus hijos, ya filtrados por el buscador de cada panel. */
interface VisibleGroup {
  group: MenuTreeNode
  children: MenuNode[]
}

function filterTree(tree: MenuTreeNode[], query: string): VisibleGroup[] {
  return tree
    .map((group) => ({
      group,
      // Si el grupo coincide se muestran todos sus hijos; si no, solo los que
      // coinciden por su cuenta.
      children: matches(group, query)
        ? group.children
        : group.children.filter((child) => matches(child, query)),
    }))
    .filter(({ group, children }) => matches(group, query) || children.length > 0)
}

/**
 * Zona de drop. Se sigue con `dragover` y no con `dragenter`/`dragleave`: al
 * abrirse el hueco fantasma la fila de destino se corre y el puntero deja de
 * estar encima, así que con `dragleave` el hueco se cerraba y se volvía a abrir
 * en un parpadeo. Con `dragover` el destino solo cambia cuando el puntero entra
 * en OTRA fila.
 */
interface DropProps {
  onDragOver: (event: DragEvent<HTMLLIElement>) => void
  onDrop: (event: DragEvent<HTMLLIElement>) => void
}

/**
 * Origen del arrastre. Va sobre la fila entera y no sobre la manija: el
 * `draggable` de un `<button>` es un caso borde que los navegadores manejan
 * distinto (y con el que el arrastre no llegaba a arrancar). La manija queda
 * como la señal de que la fila se puede mover, y como el acceso por teclado.
 */
interface DragProps {
  draggable: true
  onDragStart: (event: DragEvent<HTMLLIElement>) => void
  onDragEnd: () => void
}

/**
 * El hueco donde va a caer lo que se está arrastrando: un acordeón fantasma
 * que se abre entre las filas. Lleva las mismas props de drop que su fila de
 * destino, así que soltar sobre el hueco vale lo mismo que soltar sobre ella.
 */
function GhostSlot({ depth, dropProps }: { depth: 0 | 1; dropProps: DropProps }) {
  return (
    <li
      {...dropProps}
      aria-hidden="true"
      className={cn(
        "mx-3 my-1 rounded-md border-2 border-dashed border-ring/40 bg-muted/40",
        depth === 0 ? "h-10" : "ml-9 h-8",
      )}
    />
  )
}

function MenuRow({
  node,
  depth,
  muted,
  action,
  extra,
  tools,
  handle,
  isDragging,
  dropProps,
  dragProps,
}: {
  node: MenuNode
  depth: 0 | 1
  /** Ya asignado: se muestra apagado, como un control deshabilitado. */
  muted?: boolean
  action?: ReactNode
  extra?: ReactNode
  /** Editar / eliminar: aparecen al pasar el mouse por la fila. */
  tools?: ReactNode
  /** Manija de arrastre; acompaña a las herramientas. */
  handle?: ReactNode
  /** La fila que se está arrastrando: se apaga mientras viaja. */
  isDragging?: boolean
  /** La fila entera recibe el drop, no solo la manija. */
  dropProps?: DropProps
  /** Presente = la fila se puede arrastrar para reordenar. */
  dragProps?: DragProps
}) {
  const Icon = depth === 0 ? getNavIcon(node.icon) : null

  return (
    <li
      {...dropProps}
      {...dragProps}
      className={cn(
        // Sin borde propio: la única línea de la lista es la que separa un
        // acordeón del siguiente, y esa la pone el `<li>` del grupo.
        "group/row flex items-center gap-2 px-3 py-1.5",
        depth === 1 && "pl-9",
        // Apagado, no `disabled`: el grupo asignado se sigue pudiendo
        // colapsar —y sigue siendo zona de drop—, así que la fila no puede
        // perder los eventos del puntero.
        muted && "text-muted-foreground opacity-60",
        // El original se apaga mientras viaja: lo que marca el destino es el
        // hueco fantasma, no un resaltado sobre la fila de llegada.
        isDragging && "opacity-40",
      )}
    >
      {Icon ? (
        <Icon className="size-4 shrink-0" />
      ) : (
        <span aria-hidden="true" className="shrink-0 text-muted-foreground">
          •
        </span>
      )}
      <span className={cn("min-w-0 flex-1 truncate text-sm", depth === 0 && "font-medium")}>
        {node.name}
      </span>
      {tools || handle ? (
        // Ocultas hasta el hover para no ensuciar la lista, pero visibles con
        // el foco: si no, no habría forma de llegar a ellas por teclado.
        <span className="flex items-center opacity-0 transition-opacity group-hover/row:opacity-100 focus-within:opacity-100">
          {tools}
          {handle}
        </span>
      ) : null}
      {extra}
      {action}
    </li>
  )
}

/**
 * Manija de arrastre. No arrastra ella: el `draggable` vive en la fila (ver
 * `DragProps`). Acá es la señal de que la fila se puede mover —y el único
 * acceso por teclado, porque el arrastre nativo no lo tiene: con las flechas
 * arriba y abajo el orden queda al alcance de quien no usa mouse—.
 */
function DragHandle({ label, onMove }: { label: string; onMove: (direction: -1 | 1) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      color="muted"
      size="icon"
      className="size-7 cursor-grab active:cursor-grabbing"
      onKeyDown={(event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return
        event.preventDefault()
        onMove(event.key === "ArrowUp" ? -1 : 1)
      }}
    >
      <span className="sr-only">
        Reordenar {label}: arrastrar, o mover con las flechas arriba y abajo
      </span>
      <DotsSixVerticalIcon />
    </Button>
  )
}

function MoveButton({
  direction,
  label,
  onClick,
}: {
  direction: "assign" | "unassign"
  label: string
  onClick: () => void
}) {
  const Icon = direction === "assign" ? ArrowRightIcon : ArrowLeftIcon
  return (
    <Button
      type="button"
      variant="ghost"
      color="muted"
      size="icon"
      className="size-7"
      onClick={onClick}
    >
      <span className="sr-only">{label}</span>
      <Icon />
    </Button>
  )
}

interface MenuTransferProps {
  tree: MenuTreeNode[]
  assignedIds: number[]
  onAssign: (ids: number[]) => void
  onUnassign: (ids: number[]) => void
  disabled?: boolean
}

/**
 * Dos paneles: a la izquierda el catálogo completo de menús y a la derecha los
 * que tiene el rol. Los menús ya asignados siguen listados a la izquierda pero
 * apagados y sin flecha, para que la estructura del menú se lea igual de los
 * dos lados.
 *
 * Reglas de la jerarquía, para que el menú resultante nunca quede colgado:
 *  - asignar un ítem asigna también su grupo;
 *  - quitar un grupo quita sus ítems.
 */
export function MenuTransfer({
  tree,
  assignedIds,
  onAssign,
  onUnassign,
  disabled,
}: MenuTransferProps) {
  const [availableSearch, setAvailableSearch] = useState("")
  const [assignedSearch, setAssignedSearch] = useState("")
  // Guardamos los grupos ABIERTOS, no los cerrados: así el estado inicial
  // (lista vacía) deja todos los acordeones plegados.
  const [expanded, setExpanded] = useState<number[]>([])
  // "new" = alta; un menú = edición de ese menú; null = diálogo cerrado.
  // De un grupo se guarda el nodo del árbol —con sus `children`—: el diálogo
  // los lista como los submenús de esa carpeta.
  const [menuBeingEdited, setMenuBeingEdited] = useState<MenuNode | MenuTreeNode | "new" | null>(
    null,
  )
  // Arrastre en curso: el menú agarrado y la fila sobre la que caería. Solo el
  // panel de disponibles se puede arrastrar (ver comentario de `assignedGroups`
  // más abajo), así que no hace falta llevar de qué panel salió.
  const [dragged, setDragged] = useState<MenuNode | null>(null)
  const [dropTargetId, setDropTargetId] = useState<number | null>(null)

  const { notify } = useNotify()
  const reorderMenus = useReorderMenus({
    mutationConfig: { onError: (error) => notify(getErrorMessage(error), { variant: "error" }) },
  })

  const assigned = useMemo(() => new Set(assignedIds), [assignedIds])

  // El panel de la izquierda muestra el catálogo en su propio orden
  // (`menuOrder`, el que ya trae `buildMenuTree`) y es el único que se puede
  // reordenar.
  const availableGroups = filterTree(tree, availableSearch)

  // El de la derecha se limita a filtrar el mismo árbol a lo que el rol tiene
  // asignado: el orden ES el del catálogo, sin un orden propio del rol. Antes
  // el panel de asignados se podía reordenar por su cuenta (arrastre propio,
  // guardado como la posición dentro de `assignedIds`), pero eso duplicaba la
  // lógica de orden en el front y en el back para algo que el catálogo ya
  // resuelve: si un menú necesita otro lugar, se reordena una sola vez desde
  // "Menús disponibles" y el cambio se ve en los dos paneles.
  const assignedGroups = filterTree(tree, assignedSearch)
    .map(({ group, children }) => ({
      group,
      children: children.filter((child) => assigned.has(child.id)),
    }))
    .filter(({ group, children }) => assigned.has(group.id) || children.length > 0)

  // Los grupos que el panel de disponibles tiene a la vista: es entre ellos
  // que se reordena, aunque el `menuOrder` que se guarda sea el de la lista
  // completa.
  const availableGroupIds = availableGroups.map(({ group }) => group.id)

  /**
   * Mueve `node` al lugar de `target` dentro del catálogo. Solo entre
   * hermanos: mover un ítem a otro grupo sería cambiarle el padre, que es una
   * edición (el diálogo), no un reordenamiento.
   */
  function applyMove(node: MenuNode, target: MenuNode, siblings: MenuNode[], visibleIds: number[]) {
    if (node.id === target.id || node.idParent !== target.idParent) return

    const items = reorderSiblings(siblings, visibleIds, node.id, target.id)
    if (items.length > 0) reorderMenus.mutate(items)
  }

  /** Flechas del teclado: mueve un lugar arriba o abajo entre los visibles. */
  function moveBy(node: MenuNode, direction: -1 | 1, siblings: MenuNode[], visibleIds: number[]) {
    const targetId = visibleIds[visibleIds.indexOf(node.id) + direction]
    const target = siblings.find((it) => it.id === targetId)
    if (!target) return
    applyMove(node, target, siblings, visibleIds)
  }

  /** Hace arrastrable a la fila de `node`, en el panel de disponibles. */
  function dragProps(node: MenuNode): DragProps {
    return {
      draggable: true,
      onDragStart: (event: DragEvent<HTMLLIElement>) => {
        event.dataTransfer.effectAllowed = "move"
        // Firefox no arranca el arrastre si no hay datos en el evento.
        event.dataTransfer.setData("text/plain", node.name)
        setDragged(node)
      },
      onDragEnd: () => {
        setDragged(null)
        setDropTargetId(null)
      },
    }
  }

  /** Zona de drop de una fila: la fila entera acepta el menú arrastrado. */
  function dropProps(
    target: MenuNode,
    siblings: MenuNode[],
    visibleIds: number[],
  ): DropProps | undefined {
    if (!dragged) return undefined
    if (dragged.idParent !== target.idParent) return undefined
    return {
      // Sin `preventDefault` el navegador no considera la fila zona de drop.
      // El `stopPropagation` es por el contenedor del acordeón, que repite
      // estas props para cubrir su padding: sin frenar acá, soltar sobre una
      // fila aplicaría el movimiento dos veces.
      onDragOver: (event: DragEvent<HTMLLIElement>) => {
        event.preventDefault()
        event.stopPropagation()
        event.dataTransfer.dropEffect = "move"
        setDropTargetId(target.id)
      },
      onDrop: (event: DragEvent<HTMLLIElement>) => {
        event.preventDefault()
        event.stopPropagation()
        if (dragged) applyMove(dragged, target, siblings, visibleIds)
        setDragged(null)
        setDropTargetId(null)
      },
    }
  }

  /**
   * De qué lado de la fila de destino se abre el hueco: arriba si el menú viene
   * de más abajo, abajo si viene de más arriba. Es el lugar exacto en el que va
   * a quedar.
   */
  function ghostSide(target: MenuNode, visibleIds: number[]): "before" | "after" | null {
    if (!dragged || dropTargetId !== target.id) return null
    if (dragged.idParent !== target.idParent) return null
    const from = visibleIds.indexOf(dragged.id)
    const to = visibleIds.indexOf(target.id)
    if (from === -1 || to === -1 || from === to) return null
    return from > to ? "before" : "after"
  }

  function toggleCollapsed(id: number) {
    setExpanded((prev) => (prev.includes(id) ? prev.filter((it) => it !== id) : [...prev, id]))
  }

  function assignGroup(group: MenuTreeNode) {
    onAssign([group.id, ...group.children.map((child) => child.id)])
  }

  function unassignGroup(group: MenuTreeNode) {
    onUnassign([group.id, ...group.children.map((child) => child.id)])
  }

  /** Editar y eliminar, iguales para grupos y para ítems. */
  function rowTools(node: MenuNode | MenuTreeNode, childrenCount = 0) {
    return (
      <>
        <Button
          type="button"
          variant="ghost"
          color="muted"
          size="icon"
          className="size-7"
          onClick={() => setMenuBeingEdited(node)}
        >
          <span className="sr-only">Editar {node.name}</span>
          <PencilIcon />
        </Button>
        <DialogDeleteMenu
          menu={node}
          childrenCount={childrenCount}
          trigger={
            <Button type="button" variant="ghost" color="muted" size="icon" className="size-7">
              <span className="sr-only">Eliminar {node.name}</span>
              <TrashIcon />
            </Button>
          }
        />
      </>
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <DialogSaveMenu
        open={menuBeingEdited !== null}
        onOpenChange={(open) => !open && setMenuBeingEdited(null)}
        roots={tree}
        menu={menuBeingEdited === "new" ? undefined : (menuBeingEdited ?? undefined)}
      />

      <section className="flex flex-col rounded-lg border border-border">
        <header className="flex min-h-16 items-center justify-between gap-2 px-3 py-2">
          <h3 className="text-sm font-semibold">Menús disponibles</h3>
          <Button type="button" size="icon-sm" onClick={() => setMenuBeingEdited("new")}>
            <span className="sr-only">Agregar menú</span>
            <ControlPointIcon />
          </Button>
        </header>
        <div className="px-3 pb-3">
          <SearchMenus
            id="available-menus-search"
            value={availableSearch}
            onChange={setAvailableSearch}
          />
        </div>
        {availableGroups.length === 0 ? (
          <EmptyState message="Sin menús que coincidan." />
        ) : (
          <ul className="border-t border-border">
            {availableGroups.map(({ group, children }) => {
              const isCollapsed = !expanded.includes(group.id)
              const isAssigned = assigned.has(group.id)
              const visibleChildIds = children.map((child) => child.id)
              const groupDrop = dropProps(group, tree, availableGroupIds)
              const ghost = ghostSide(group, availableGroupIds)
              return (
                <Fragment key={group.id}>
                  {ghost === "before" && groupDrop && <GhostSlot depth={0} dropProps={groupDrop} />}
                  {/* El contenedor repite la zona de drop del grupo: su padding
                      es un par de píxeles donde el drop se perdía. */}
                  <li {...groupDrop} className="border-b border-border py-1 last:border-b-0">
                    <ul>
                      <MenuRow
                        node={group}
                        depth={0}
                        muted={isAssigned}
                        // Un grupo ya asignado queda solo para abrir y cerrar:
                        // se administra desde el panel de la derecha, así que
                        // no ofrece ni editar/eliminar ni la flecha.
                        tools={isAssigned ? undefined : rowTools(group, group.children.length)}
                        // El orden se administra donde el menú está activo: acá
                        // si está libre, y en el panel de la derecha si ya es
                        // del rol. La fila, en cambio, siempre recibe el drop
                        // —si no, no habría cómo pasar por encima de un grupo
                        // apagado—.
                        handle={
                          isAssigned || disabled ? undefined : (
                            <DragHandle
                              label={group.name}
                              onMove={(direction) => moveBy(group, direction, tree, availableGroupIds)}
                            />
                          )
                        }
                        isDragging={dragged?.id === group.id}
                        dropProps={groupDrop}
                        dragProps={isAssigned || disabled ? undefined : dragProps(group)}
                        extra={
                          children.length > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              color="muted"
                              size="icon"
                              className="size-7 [&_svg:not([class*='size-'])]:size-5"
                              onClick={() => toggleCollapsed(group.id)}
                            >
                              <span className="sr-only">
                                {isCollapsed ? "Mostrar" : "Ocultar"} los menús de {group.name}
                              </span>
                              {isCollapsed ? <CaretDownIcon /> : <CaretUpIcon />}
                            </Button>
                          )
                        }
                        // Sin hueco reservado cuando no hay flecha: el espacio
                        // vacío dejaba al chevron colgado en el aire, lejos del
                        // borde. Sin él, el chevron cierra la fila igual que la
                        // flecha en las filas activas.
                        action={
                          !isAssigned && !disabled ? (
                            <MoveButton
                              direction="assign"
                              label={`Asignar ${group.name}`}
                              onClick={() => assignGroup(group)}
                            />
                          ) : undefined
                        }
                      />
                      {!isCollapsed &&
                        children.map((child) => {
                          const childAssigned = assigned.has(child.id)
                          const childDrop = dropProps(child, group.children, visibleChildIds)
                          const childGhost = ghostSide(child, visibleChildIds)
                          return (
                            <Fragment key={child.id}>
                              {childGhost === "before" && childDrop && (
                                <GhostSlot depth={1} dropProps={childDrop} />
                              )}
                              <MenuRow
                                node={child}
                                depth={1}
                                muted={childAssigned}
                                // Cada ítem se apaga por su cuenta, no por el
                                // grupo: uno que todavía no se mandó sigue
                                // activo acá aunque su grupo ya sea del rol
                                // —si no, no habría cómo asignarlo ni editarlo—.
                                tools={childAssigned ? undefined : rowTools(child)}
                                handle={
                                  childAssigned || disabled ? undefined : (
                                    <DragHandle
                                      label={child.name}
                                      onMove={(direction) =>
                                        moveBy(child, direction, group.children, visibleChildIds)
                                      }
                                    />
                                  )
                                }
                                isDragging={dragged?.id === child.id}
                                dropProps={childDrop}
                                dragProps={childAssigned || disabled ? undefined : dragProps(child)}
                                action={
                                  !childAssigned && !disabled ? (
                                    <MoveButton
                                      direction="assign"
                                      label={`Asignar ${child.name}`}
                                      // El grupo va junto con el ítem: un ítem
                                      // sin su grupo no se podría pintar.
                                      onClick={() => onAssign([group.id, child.id])}
                                    />
                                  ) : undefined
                                }
                              />
                              {childGhost === "after" && childDrop && (
                                <GhostSlot depth={1} dropProps={childDrop} />
                              )}
                            </Fragment>
                          )
                        })}
                    </ul>
                  </li>
                  {ghost === "after" && groupDrop && <GhostSlot depth={0} dropProps={groupDrop} />}
                </Fragment>
              )
            })}
          </ul>
        )}
      </section>

      <section className="flex flex-col rounded-lg border border-border">
        {/* `min-h-16` iguala el alto del encabezado de enfrente, que lo marca
            el botón de agregar: sin eso los dos paneles arrancan desfasados. */}
        <header className="flex min-h-16 items-center gap-2 px-3 py-2">
          <h3 className="text-sm font-semibold">Menús asignados</h3>
        </header>
        <div className="px-3 pb-3">
          <SearchMenus
            id="assigned-menus-search"
            value={assignedSearch}
            onChange={setAssignedSearch}
          />
        </div>
        {assignedGroups.length === 0 ? (
          <EmptyState message="El rol todavía no tiene menús asignados." />
        ) : (
          <ul className="border-t border-border">
            {assignedGroups.map(({ group, children }) => {
              const isCollapsed = !expanded.includes(group.id)
              return (
                <li key={group.id} className="border-b border-border py-1 last:border-b-0">
                  <ul>
                    <MenuRow
                      node={group}
                      depth={0}
                      extra={
                        children.length > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            color="muted"
                            size="icon"
                            className="size-7 [&_svg:not([class*='size-'])]:size-5"
                            onClick={() => toggleCollapsed(group.id)}
                          >
                            <span className="sr-only">
                              {isCollapsed ? "Mostrar" : "Ocultar"} los menús de {group.name}
                            </span>
                            {isCollapsed ? <CaretDownIcon /> : <CaretUpIcon />}
                          </Button>
                        )
                      }
                      action={
                        disabled ? undefined : (
                          <MoveButton
                            direction="unassign"
                            // Quitar el grupo se lleva sus ítems: si no, quedarían
                            // sin dónde colgarse.
                            label={`Quitar ${group.name}`}
                            onClick={() => unassignGroup(group)}
                          />
                        )
                      }
                    />
                    {!isCollapsed &&
                      children.map((child) => (
                        <MenuRow
                          key={child.id}
                          node={child}
                          depth={1}
                          action={
                            disabled ? undefined : (
                              <MoveButton
                                direction="unassign"
                                label={`Quitar ${child.name}`}
                                onClick={() => onUnassign([child.id])}
                              />
                            )
                          }
                        />
                      ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
