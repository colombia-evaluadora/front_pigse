import { describe, expect, it } from "vitest"

import { buildQuery, optionsTerm, parseQuery, type QuerySyntax } from "@/components/search/query-syntax"

interface Filtros {
  search: string
  roles: string[]
}

const ROLES = [
  { value: "AUXILIAR_ADMINISTRATIVO", label: "Auxiliar administrativo" },
  { value: "RECTOR", label: "Rector" },
  { value: "DOCENTE", label: "Docente" },
  { value: "DIRECTOR_GRUPO", label: "Director de grupo" },
]

function sintaxis(opciones: { value: string; label: string }[]): QuerySyntax<Filtros> {
  return {
    empty: { search: "", roles: [] },
    freeText: { key: "texto", field: "search" },
    terms: [optionsTerm("rol", "roles", opciones)],
  }
}

describe("buildQuery", () => {
  it("escribe la etiqueta, no el código", () => {
    expect(buildQuery(sintaxis(ROLES), { search: "", roles: ["RECTOR"] })).toBe("rol:(Rector)")
  })

  it("la búsqueda libre va suelta, nunca como texto:(...)", () => {
    const texto = buildQuery(sintaxis(ROLES), { search: "colegio", roles: [] })
    expect(texto).toBe("colegio")
    expect(texto).not.toContain("texto:")
  })

  it("omite el término mientras el catálogo no cargó", () => {
    // Es el caso del refresh: los filtros vienen de la URL pero el catálogo
    // todavía está en vuelo. Caer al valor crudo pintaba el código en el input
    // y se quedaba pegado.
    expect(buildQuery(sintaxis([]), { search: "", roles: ["RECTOR"] })).toBe("")
  })

  it("con el catálogo cargado, un valor que ya no figura sí se muestra crudo", () => {
    // Acá el catálogo SÍ está y el valor no aparece: es un dato real —el rol
    // fue dado de baja— y esconderlo dejaría un filtro activo invisible.
    expect(buildQuery(sintaxis(ROLES), { search: "", roles: ["NO_EXISTE"] })).toBe(
      "rol:(NO_EXISTE)",
    )
  })
})

describe("parseQuery: coincidencia parcial", () => {
  it("escribir de menos trae lo que coincide", () => {
    expect(parseQuery(sintaxis(ROLES), "rol:(Auxiliar)")).toEqual({
      search: "",
      roles: ["AUXILIAR_ADMINISTRATIVO"],
    })
  })

  it("una parcial con varias coincidencias las trae todas", () => {
    // "d" aparece en Docente y en Director de grupo.
    const filtros = parseQuery(sintaxis(ROLES), "rol:(Docen)")
    expect(filtros.roles).toEqual(["DOCENTE"])
    const varias = parseQuery(sintaxis(ROLES), "rol:(or)")
    expect(varias.roles).toContain("RECTOR")
    expect(varias.roles).toContain("DIRECTOR_GRUPO")
  })

  it("la coincidencia exacta gana sola", () => {
    // Sin esta precedencia, un catálogo con "Rector" y "Rector encargado"
    // haría imposible pedir solo el primero.
    const opciones = [...ROLES, { value: "RECTOR_ENCARGADO", label: "Rector encargado" }]
    expect(parseQuery(sintaxis(opciones), "rol:(Rector)").roles).toEqual(["RECTOR"])
  })

  it("acepta el código además de la etiqueta", () => {
    expect(parseQuery(sintaxis(ROLES), "rol:(DOCENTE)").roles).toEqual(["DOCENTE"])
  })
})

describe("parseQuery: términos que no resuelven", () => {
  it("una clave conocida sin coincidencia NO cae a búsqueda libre", () => {
    // El bug: con el catálogo sin cargar, `rol:(Auxiliar)` se volvía la
    // búsqueda literal de esa cadena, y al reescribirse quedaba anidada
    // (`texto:(rol:(Auxiliar))`).
    const filtros = parseQuery(sintaxis([]), "rol:(Auxiliar)")
    expect(filtros.search).toBe("")
    expect(filtros.roles).toEqual([])
  })

  it("una clave desconocida sí es texto libre", () => {
    // Alguien escribió algo con dos puntos que no es un término de este
    // buscador: eso es texto, no un filtro que se perdió.
    expect(parseQuery(sintaxis(ROLES), "inventado:(x)").search).toBe("inventado:(x)")
  })

  it("sigue aceptando texto:(...) escrito a mano", () => {
    expect(parseQuery(sintaxis(ROLES), "texto:(colegio)").search).toBe("colegio")
  })

  it("texto suelto vale como búsqueda libre", () => {
    expect(parseQuery(sintaxis(ROLES), "colegio").search).toBe("colegio")
  })
})

describe("ida y vuelta", () => {
  it("lo que se escribe se vuelve a leer igual", () => {
    const sx = sintaxis(ROLES)
    const filtros = { search: "colegio", roles: ["RECTOR", "DOCENTE"] }
    expect(parseQuery(sx, buildQuery(sx, filtros))).toEqual(filtros)
  })
})
