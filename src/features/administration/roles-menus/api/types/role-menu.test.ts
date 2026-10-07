import { describe, expect, it } from "vitest"

import {
  partitionKnownMenus,
  reorderSiblings,
  withRequiredParents,
} from "@/features/administration/roles-menus/api/types/role-menu"
import type {
  MenuNode,
  MenuTreeNode,
} from "@/features/administration/roles-menus/api/types/role-menu"

function menu(id: number, menuOrder: number, idParent: number | null = null): MenuNode {
  return { id, name: `Menú ${id}`, icon: "", path: "", menuOrder, type: "GROUP", idParent }
}

// a=0 · b=1 · c=2 · d=3
const siblings = [menu(1, 0), menu(2, 1), menu(3, 2), menu(4, 3)]
const allVisible = [1, 2, 3, 4]

describe("reorderSiblings", () => {
  it("mueve hacia arriba y solo devuelve los que cambiaron", () => {
    expect(reorderSiblings(siblings, allVisible, 3, 1)).toEqual([
      { id: 3, menuOrder: 0 },
      { id: 1, menuOrder: 1 },
      { id: 2, menuOrder: 2 },
    ])
  })

  it("mueve hacia abajo", () => {
    expect(reorderSiblings(siblings, allVisible, 1, 3)).toEqual([
      { id: 2, menuOrder: 0 },
      { id: 3, menuOrder: 1 },
      { id: 1, menuOrder: 2 },
    ])
  })

  it("no toca a los hermanos que no están a la vista", () => {
    // Con el panel filtrado a 1 y 4, intercambiarlos usa solo las posiciones
    // 0 y 3: 2 y 3 se quedan donde están.
    expect(reorderSiblings(siblings, [1, 4], 4, 1)).toEqual([
      { id: 4, menuOrder: 0 },
      { id: 1, menuOrder: 3 },
    ])
  })

  it("no devuelve nada si el destino es el mismo lugar o no está a la vista", () => {
    expect(reorderSiblings(siblings, allVisible, 2, 2)).toEqual([])
    expect(reorderSiblings(siblings, [1, 2], 1, 4)).toEqual([])
  })
})

describe("withRequiredParents", () => {
  // 1 = grupo, 11 y 12 = sus ítems.
  const tree: MenuTreeNode[] = [
    { ...menu(1, 0), children: [menu(11, 0, 1), menu(12, 1, 1)] },
  ]

  it("mete al padre justo antes de su primer hijo", () => {
    expect(withRequiredParents([11, 12], tree)).toEqual([1, 11, 12])
  })

  it("no duplica al padre que ya venía en la lista", () => {
    expect(withRequiredParents([1, 11], tree)).toEqual([1, 11])
  })

  it("deja como están los ids que el catálogo no ubica", () => {
    expect(withRequiredParents([99], tree)).toEqual([99])
  })
})

describe("partitionKnownMenus", () => {
  const tree: MenuTreeNode[] = [
    { ...menu(1, 0), children: [menu(11, 0, 1)] },
  ]

  it("separa al nieto cuya rama de ancestros fue dada de baja", () => {
    // El caso real: 299 cuelga de 267, que está inactivo y por eso no viene en
    // el catálogo. `buildMenuTree` no lo alcanza y el id queda sin ubicar.
    expect(partitionKnownMenus([1, 11, 299], tree)).toEqual({
      known: [1, 11],
      unknown: [299],
    })
  })

  it("conserva el orden de la lista original", () => {
    expect(partitionKnownMenus([11, 1], tree).known).toEqual([11, 1])
  })

  it("sin catálogo no ubica nada", () => {
    expect(partitionKnownMenus([1, 11], [])).toEqual({ known: [], unknown: [1, 11] })
  })
})
