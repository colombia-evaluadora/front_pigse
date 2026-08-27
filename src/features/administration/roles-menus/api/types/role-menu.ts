export interface Role {
  id: number
  name: string
}

/** Plan comercial al que puede quedar atado un menú. */
export interface Plan {
  id: number
  name: string
}

/**
 * Menú tal como lo entrega el SSO: lista plana, jerarquía por `idParent`.
 * Es la misma forma de `RouteResponseDto` (features/navigation) menos
 * `roleIds`: acá la asignación por rol se pide aparte, porque la pantalla
 * edita un rol a la vez.
 */
export interface MenuNode {
  id: number
  name: string
  /** Los grupos sin ícono cargado llegan en `null` (26 de los 163 del catálogo real). */
  icon: string | null
  /** Un grupo puede no tener ruta propia: agrupa, no navega. */
  path: string | null
  menuOrder: number
  type: string
  idParent: number | null
  /** Si se pinta en el menú lateral. Los menús viejos no lo traen: se asume `true`. */
  visible?: boolean
  planId?: number | null
}

export interface MenuTreeNode extends MenuNode {
  children: MenuNode[]
}

export interface UpdateRoleMenusResult {
  status: "success" | "error"
  message: string
}

/** Nuevo `menuOrder` de un menú, tal como se manda al guardar el orden. */
export interface MenuOrderItem {
  id: number
  menuOrder: number
}

/**
 * Mueve `draggedId` a la posición de `targetId` dentro de `siblings` y devuelve
 * el `menuOrder` de cada hermano.
 *
 * `visibleIds` es la lista que el usuario ve —el panel puede estar filtrado por
 * el buscador, o mostrar solo los menús del rol—, así que el movimiento se
 * resuelve entre esos y después se vuelca sobre las posiciones que ese
 * subconjunto ocupaba en la lista completa. Sin eso, arrastrar en una lista
 * filtrada reordenaría también a los hermanos que no están a la vista.
 */
export function reorderSiblings(
  siblings: MenuNode[],
  visibleIds: number[],
  draggedId: number,
  targetId: number,
): MenuOrderItem[] {
  const ordered = [...siblings].sort((a, b) => a.menuOrder - b.menuOrder)

  // Posiciones (en la lista completa) que ocupa lo que se ve: son las ranuras
  // que el movimiento puede reescribir.
  const slots: number[] = []
  const visible: number[] = []
  ordered.forEach((menu, index) => {
    if (visibleIds.includes(menu.id)) {
      slots.push(index)
      visible.push(menu.id)
    }
  })

  const from = visible.indexOf(draggedId)
  const to = visible.indexOf(targetId)
  if (from === -1 || to === -1 || from === to) return []

  visible.splice(to, 0, ...visible.splice(from, 1))

  const next = [...ordered]
  slots.forEach((slot, index) => {
    next[slot] = ordered.find((menu) => menu.id === visible[index])!
  })

  // Solo los que efectivamente cambiaron de lugar.
  return next
    .map((menu, index) => ({ id: menu.id, menuOrder: index }))
    .filter(({ id, menuOrder }) => ordered.find((menu) => menu.id === id)!.menuOrder !== menuOrder)
}

/**
 * Completa la lista de asignados con el padre de todo submenú que lo tenga
 * ausente, respetando el orden (el padre entra justo antes de su primer hijo).
 *
 * El backend valida la invariante de jerarquía: `fn_associate_menus_to_rol`
 * aborta la operación entera si `p_pk_tmenus` trae un submenú sin su padre. Y
 * la lista puede llegar rota desde la propia base —la versión anterior de esa
 * función era un UPSERT sin invariante, así que aceptó hijos sueltos—, con lo
 * cual el front hereda el problema apenas vuelve a guardar (reordenar alcanza,
 * porque reenvía el mismo conjunto que recibió).
 *
 * Los ids que no están en el catálogo se dejan como están: no se puede saber si
 * son grupos o submenús, y descartarlos perdería asignaciones en silencio.
 */
/**
 * Separa los asignados en los que el catálogo sabe ubicar y los que no.
 *
 * Un id queda "huérfano" cuando no aparece en el árbol: pasa cuando su menú
 * padre fue dado de baja (`active = false`) y el catálogo ya no lo devuelve, o
 * cuando la jerarquía tiene más de dos niveles y `buildMenuTree` no lo alcanza.
 * Esos ids son fantasmas: `MenuTransfer` no los pinta —se dibuja desde el
 * árbol—, así que no se pueden ver ni quitar desde la pantalla, pero viajan en
 * cada guardado y hacen que el backend rechace la operación entera por la
 * invariante de jerarquía.
 *
 * `withRequiredParents` no puede rescatarlos: no hay forma de saber cuál era el
 * padre. Se separan para dejarlos fuera del envío y avisarle a quien guarda, en
 * vez de mandar una lista que el backend va a rechazar.
 */
export function partitionKnownMenus(
  assignedIds: number[],
  tree: MenuTreeNode[],
): { known: number[]; unknown: number[] } {
  const inTree = new Set<number>()
  for (const group of tree) {
    inTree.add(group.id)
    for (const child of group.children) inTree.add(child.id)
  }

  const known: number[] = []
  const unknown: number[] = []
  for (const id of assignedIds) (inTree.has(id) ? known : unknown).push(id)
  return { known, unknown }
}
export function withRequiredParents(assignedIds: number[], tree: MenuTreeNode[]): number[] {
  const parentOf = new Map<number, number | null>()
  for (const group of tree) {
    parentOf.set(group.id, null)
    for (const child of group.children) parentOf.set(child.id, group.id)
  }

  const next: number[] = []
  const seen = new Set<number>()
  for (const id of assignedIds) {
    const parentId = parentOf.get(id)
    if (parentId != null && !seen.has(parentId)) {
      next.push(parentId)
      seen.add(parentId)
    }
    if (seen.has(id)) continue
    next.push(id)
    seen.add(id)
  }
  return next
}

/**
 * Reordena los menús DE UN ROL. Es un orden distinto al del catálogo
 * (`menuOrder`): dice en qué secuencia ve el menú ese rol, y se guarda como el
 * orden de la lista de asignados, no tocando el catálogo.
 *
 * La lista es plana, así que se mueve por bloques: un grupo se lleva a sus
 * ítems, y un ítem se mueve solo dentro de su grupo. Mover un ítem a otro grupo
 * sería cambiarle el padre —eso es editar el menú, no reordenar el rol—.
 */
export function reorderAssignedMenus(
  assignedIds: number[],
  tree: MenuTreeNode[],
  draggedId: number,
  targetId: number,
): number[] {
  const parentOf = new Map<number, number | null>()
  for (const group of tree) {
    parentOf.set(group.id, null)
    for (const child of group.children) parentOf.set(child.id, group.id)
  }

  const draggedParent = parentOf.get(draggedId)
  if (draggedId === targetId || draggedParent === undefined) return assignedIds
  if (draggedParent !== parentOf.get(targetId)) return assignedIds

  const blocks = assignedIds
    .filter((id) => parentOf.get(id) === null)
    .map((groupId) => ({
      groupId,
      childIds: assignedIds.filter((id) => parentOf.get(id) === groupId),
    }))

  if (draggedParent === null) {
    const from = blocks.findIndex((block) => block.groupId === draggedId)
    const to = blocks.findIndex((block) => block.groupId === targetId)
    if (from === -1 || to === -1) return assignedIds
    blocks.splice(to, 0, ...blocks.splice(from, 1))
  } else {
    const block = blocks.find((it) => it.groupId === draggedParent)
    if (!block) return assignedIds
    const from = block.childIds.indexOf(draggedId)
    const to = block.childIds.indexOf(targetId)
    if (from === -1 || to === -1) return assignedIds
    block.childIds.splice(to, 0, ...block.childIds.splice(from, 1))
  }

  const next = blocks.flatMap((block) => [block.groupId, ...block.childIds])
  // Lo que no entró en ningún bloque (un menú asignado que ya no está en el
  // catálogo) se conserva: reordenar no puede perder asignaciones.
  return [...next, ...assignedIds.filter((id) => !next.includes(id))]
}

/**
 * Arma el árbol de dos niveles (grupo → ítems) que pinta la pantalla.
 *
 * Dos niveles NO es una limitación a corregir: es la invariante del backend.
 * `fn_upsert_menu` rechaza explícitamente crear un tercer nivel (ERRCODE
 * `22023`, "el padre pk=% ... no es un menu raiz"), tanto al crear como al
 * reparentar. Volver esto recursivo aceptaría estructuras que el backend no
 * deja construir.
 *
 * Lo que sí existía era data legacy más profunda, anterior a esa restricción
 * (el menú 299 colgado de 267): esos nodos caían acá como "huérfanos". La
 * migración V115 del SSO los desactiva y evita que vuelvan a aparecer —
 * `fn_list_available_menus` ahora solo devuelve menús con la cadena de
 * ancestros activa—. `partitionKnownMenus` los sigue filtrando igual, como red
 * de seguridad.
 */
export function buildMenuTree(menus: MenuNode[]): MenuTreeNode[] {
  const byOrder = (a: MenuNode, b: MenuNode) => a.menuOrder - b.menuOrder

  return menus
    .filter((menu) => menu.idParent === null)
    .sort(byOrder)
    .map((root) => ({
      ...root,
      children: menus.filter((menu) => menu.idParent === root.id).sort(byOrder),
    }))
}
