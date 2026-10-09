import { describe, expect, it } from "vitest"

import { paths } from "@/config/paths"
import { toNavItemDtos, type MenuSource } from "@/features/navigation/api/menu-mapper"
import {
  canAccessPath,
  getMenuUrls,
  normalizePath,
  type MenuAccessEntry,
} from "@/features/navigation/lib/route-access"

const GESTION_DOCUMENTAL = paths.app.gestionDocumental.getHref()
const MONITOREO = paths.app.monitoreoCumplimiento.getHref()
const ESTABLECIMIENTO = paths.app.establishments.general.getHref()
const SEDES = paths.app.establishments.campuses.getHref()
const FUNCIONARIOS = paths.app.establishments.officials.getHref()
const REGISTRO_ACTIVIDAD = paths.app.auditoriaSesiones.getHref()
const ROLES_MENUS = paths.app.rolesMenus.getHref()
const ACTIVIDAD_USUARIOS = paths.app.actividadUsuarios.getHref()

/** Menú plano: un ítem por URL. */
function menuOf(...urls: string[]): MenuAccessEntry[] {
  return urls.map((url) => ({ url }))
}

const TODOS_LOS_MENUS = [
  GESTION_DOCUMENTAL,
  MONITOREO,
  ESTABLECIMIENTO,
  SEDES,
  FUNCIONARIOS,
  REGISTRO_ACTIVIDAD,
  ROLES_MENUS,
  ACTIVIDAD_USUARIOS,
]

/**
 * Tabla ruta → menú dueño. Recorre TODAS las rutas de `router.tsx` bajo
 * `/app` que pasan por el guard (el índice `/app` y `/app/sin-acceso` quedan
 * fuera del guard por cómo cuelgan en el árbol). Si se agrega una ruta, va
 * acá con su menú dueño — o con `null` si a propósito no tiene ninguno.
 */
const RUTAS: Array<[ruta: string, duenos: string[] | null]> = [
  [paths.app.rolesMenus.getHref(), [ROLES_MENUS]],
  [paths.app.actividadUsuarios.getHref(), [ACTIVIDAD_USUARIOS]],
  [paths.app.auditoriaSesiones.getHref(), [REGISTRO_ACTIVIDAD]],
  [paths.app.auditoriaSesionOperaciones.getHref("abc-123"), [REGISTRO_ACTIVIDAD]],
  [paths.app.auditoriaTablas.getHref(), [REGISTRO_ACTIVIDAD]],
  [paths.app.auditoriaTablaDetalle.getHref("testablecimiento"), [REGISTRO_ACTIVIDAD]],
  [paths.app.establishments.general.getHref(), [ESTABLECIMIENTO]],
  [paths.app.establishments.add.getHref(), [ESTABLECIMIENTO]],
  [paths.app.establishments.edit.getHref(42), [ESTABLECIMIENTO]],
  [paths.app.establishments.campuses.getHref(), [SEDES]],
  [paths.app.establishments.officials.getHref(), [FUNCIONARIOS]],
  [paths.app.gestionDocumental.getHref(), [GESTION_DOCUMENTAL]],
  [paths.app.gestionDocumentalDetalle.getHref("PEI"), [GESTION_DOCUMENTAL]],
  [paths.app.monitoreoCumplimiento.getHref(), [MONITOREO]],
  [paths.app.visor.getHref("PEI"), [GESTION_DOCUMENTAL, MONITOREO]],
  // Sin ítem de menú propio (V522): la abren Gestión documental o Monitoreo.
  [paths.app.gestionDocumentalFechaLimite.getHref(), [GESTION_DOCUMENTAL, MONITOREO]],
]

describe("canAccessPath — tabla de rutas", () => {
  it.each(RUTAS)("%s: entra con cada uno de sus menús dueños", (ruta, duenos) => {
    for (const dueno of duenos ?? []) {
      expect(canAccessPath(ruta, menuOf(dueno))).toBe(true)
    }
  })

  it.each(RUTAS)("%s: no entra con todos los demás menús", (ruta, duenos) => {
    const otros = TODOS_LOS_MENUS.filter((url) => !(duenos ?? []).includes(url))
    expect(canAccessPath(ruta, menuOf(...otros))).toBe(false)
  })

  it("una ruta con dueños igual entra si el usuario tiene un menú con esa URL exacta", () => {
    const fechaLimite = paths.app.gestionDocumentalFechaLimite.getHref()
    expect(canAccessPath(fechaLimite, menuOf(fechaLimite))).toBe(true)
  })

  it("menú vacío: no entra a nada", () => {
    for (const [ruta] of RUTAS) expect(canAccessPath(ruta, [])).toBe(false)
  })
})

describe("canAccessPath — regla de prefijo", () => {
  it("permite la URL exacta y lo que cuelga de ella", () => {
    const menu = menuOf(GESTION_DOCUMENTAL)
    expect(canAccessPath("/app/gestion-documental", menu)).toBe(true)
    expect(canAccessPath("/app/gestion-documental/PEC", menu)).toBe(true)
  })

  it("respeta el límite de segmento", () => {
    const menu = menuOf(GESTION_DOCUMENTAL)
    expect(canAccessPath("/app/gestion-documental-x", menu)).toBe(false)
    expect(canAccessPath("/app/gestion", menu)).toBe(false)
  })

  it("un hijo no da acceso a sus hermanos", () => {
    const menu = menuOf(FUNCIONARIOS)
    expect(canAccessPath(FUNCIONARIOS, menu)).toBe(true)
    expect(canAccessPath(SEDES, menu)).toBe(false)
    expect(canAccessPath(ESTABLECIMIENTO, menu)).toBe(false)
    expect(canAccessPath("/app/establecimiento-educativo", menu)).toBe(false)
  })

  it("tolera query, hash, barra final, barras dobles y mayúsculas", () => {
    const menu = menuOf(ROLES_MENUS)
    expect(canAccessPath("/app/administracion/roles-menus/", menu)).toBe(true)
    expect(canAccessPath("/app/administracion/roles-menus?tab=1#x", menu)).toBe(true)
    expect(canAccessPath("/app//administracion/roles-menus", menu)).toBe(true)
    expect(canAccessPath("/app/Administracion/Roles-Menus", menu)).toBe(true)
  })

  it("acepta URLs de menú con o sin barra final y en otra capitalización", () => {
    expect(canAccessPath(MONITOREO, menuOf("/app/Monitoreo-Cumplimiento/"))).toBe(true)
  })

  it("niega segmentos . y .. (también codificados) aunque el texto cuelgue de un menú", () => {
    const menu = menuOf(GESTION_DOCUMENTAL)
    expect(canAccessPath("/app/gestion-documental/../administracion/roles-menus", menu)).toBe(false)
    expect(canAccessPath("/app/gestion-documental/%2e%2e/administracion/roles-menus", menu)).toBe(
      false,
    )
    expect(canAccessPath("/app/gestion-documental/./PEI", menu)).toBe(false)
  })

  it("niega barras codificadas y escapes mal formados", () => {
    const menu = menuOf(GESTION_DOCUMENTAL)
    expect(canAccessPath("/app/gestion-documental/%2F..%2Fadministracion", menu)).toBe(false)
    expect(canAccessPath("/app/gestion-documental/%5C", menu)).toBe(false)
    expect(canAccessPath("/app/gestion-documental/%E0%A4%A", menu)).toBe(false)
  })

  it("un menú con path vacío, `/` o `/app` no abre todo `/app/*`", () => {
    for (const url of ["", "/", "/app", "/app/"]) {
      expect(canAccessPath(ROLES_MENUS, menuOf(url))).toBe(false)
    }
  })

  it("cuenta las URLs de los hijos de un grupo", () => {
    const menu: MenuAccessEntry[] = [
      { url: ESTABLECIMIENTO, items: [{ url: ESTABLECIMIENTO }, { url: SEDES }] },
    ]
    expect(canAccessPath(SEDES, menu)).toBe(true)
    expect(canAccessPath(FUNCIONARIOS, menu)).toBe(false)
  })
})

describe("canAccessPath — con el menú mapeado (toNavItemDtos)", () => {
  // Grupo con path propio cargado en la BD (pensado para el rol con más
  // acceso) + un solo hijo asignado a este usuario. El path del grupo NO
  // debe dar acceso al resto del subárbol.
  const filas: MenuSource[] = [
    {
      id: 103,
      name: "Establecimiento Educativo",
      icon: null,
      path: "/app/establecimiento-educativo",
      menuOrder: 4,
      idParent: null,
    },
    {
      id: 106,
      name: "Funcionarios",
      icon: null,
      path: FUNCIONARIOS,
      menuOrder: 2,
      idParent: 103,
    },
    {
      id: 108,
      name: "Oculto",
      icon: null,
      path: ROLES_MENUS,
      menuOrder: 9,
      idParent: null,
      visible: false,
    },
  ]
  const menu = toNavItemDtos(filas)

  it("el path propio de un grupo con hijos no abre el subárbol", () => {
    expect(canAccessPath(FUNCIONARIOS, menu)).toBe(true)
    expect(canAccessPath(ESTABLECIMIENTO, menu)).toBe(false)
    expect(canAccessPath(SEDES, menu)).toBe(false)
    expect(canAccessPath(paths.app.establishments.add.getHref(), menu)).toBe(false)
  })

  it("un menú con visible: false no da acceso", () => {
    expect(canAccessPath(ROLES_MENUS, menu)).toBe(false)
  })
})

describe("normalizePath / getMenuUrls", () => {
  it("normaliza", () => {
    expect(normalizePath("/App//Gestion-Documental/?x=1")).toBe("/app/gestion-documental")
    expect(normalizePath("/")).toBe("/")
    expect(normalizePath("/app/%41BC")).toBe("/app/abc")
  })

  it("rechaza lo que no es confiable", () => {
    expect(normalizePath("/app/..")).toBeNull()
    expect(normalizePath("/app/%2e")).toBeNull()
    expect(normalizePath("/app/%zz")).toBeNull()
  })

  it("aplana ítems e hijos y descarta URLs que abrirían todo", () => {
    expect(
      getMenuUrls([{ url: "/app" }, { url: MONITOREO, items: [{ url: "/" }, { url: SEDES }] }]),
    ).toEqual([MONITOREO, SEDES])
  })
})
