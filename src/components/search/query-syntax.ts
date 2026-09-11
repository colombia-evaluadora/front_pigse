/**
 * Sintaxis de consulta de los buscadores, al estilo Gmail: los filtros no son
 * chips debajo de la barra, son texto dentro del propio input —
 * `estado:(Activo) desde:(2026-08-06)`—.
 *
 * Que sean texto tiene una consecuencia buscada: quitar un filtro es borrar
 * sus caracteres, sin una X por término ni una fila de chips que empuje la
 * tabla hacia abajo cada vez que se filtra. Y a la vez obliga a que el par
 * serializar/parsear sea reversible, porque el input se re-sincroniza con los
 * filtros de la URL cada vez que cambian.
 *
 * Cada buscador declara su `QuerySyntax`: qué claves existen, cómo se lee cada
 * valor y cuál es el campo de búsqueda libre —lo que se escribe sin clave—.
 * Los helpers de abajo (`textTerm`, `optionTerm`, `optionsTerm`) cubren los
 * tres casos que aparecen en la app; `wildcard` queda para las claves
 * dinámicas (los filtros por campo de la auditoría por tabla).
 */

/** Una opción de un catálogo: lo que se guarda y lo que se escribe/lee. */
export interface QueryOption {
  value: string
  label: string
}

/** Un término con clave fija: `estado:(Activo)`. */
export interface QueryTerm<F> {
  key: string
  /** Filtros → valores visibles. Un término emitido por valor. */
  toValues: (filters: F) => string[]
  /**
   * Valor escrito → parche sobre lo parseado hasta ahora. `undefined` cuando
   * el valor no se reconoce: el término se deja como texto tal cual estaba.
   */
  fromValue: (value: string, draft: F) => Partial<F> | undefined
}

/** El campo que recibe lo que se escribe sin clave. También tiene la suya. */
export interface FreeTextTerm<F> {
  key: string
  field: keyof F & string
}

/** Claves que no se conocen de antemano (p. ej. columnas de una tabla). */
export interface WildcardTerm<F> {
  /** Filtros → términos completos, ya con su clave. */
  toTerms: (filters: F) => string[]
  /** Clave desconocida + valor → parche; `undefined` si no aplica. */
  fromTerm: (key: string, value: string, draft: F) => Partial<F> | undefined
}

export interface QuerySyntax<F> {
  /** Filtros vacíos: el parseo arranca de acá, así que tiene que traer todos
   *  los campos. Lo que no cubra ningún término se pierde al escribir. */
  empty: F
  terms: QueryTerm<F>[]
  freeText: FreeTextTerm<F>
  wildcard?: WildcardTerm<F>
}

// Un término es `clave:(valor)`. La clave no lleva espacios ni paréntesis; el
// valor es todo hasta el primer `)`, así que no admite paréntesis anidados —
// suficiente para los valores que manejan estos buscadores.
const TERM_RE = /([^\s:()]+):\(([^)]*)\)/g

/** Filtros → el texto que se ve dentro del input. */
export function buildQuery<F extends object>(syntax: QuerySyntax<F>, filters: F): string {
  const terms: string[] = []

  for (const term of syntax.terms) {
    for (const value of term.toValues(filters)) {
      if (value !== "") terms.push(`${term.key}:(${value})`)
    }
  }
  if (syntax.wildcard) terms.push(...syntax.wildcard.toTerms(filters))

  // La búsqueda libre va SUELTA, sin clave. Escribirla como `texto:(...)`
  // hacía que el buscador se contestara a sí mismo: quien tecleaba "colegio"
  // veía aparecer `texto:(colegio)` sin haberlo pedido, y peor, cualquier
  // término que no resolviera terminaba envuelto ahí — `texto:(rol:(Auxiliar))`
  // —, convirtiendo un filtro en una búsqueda literal de esa cadena.
  //
  // Sigue aceptándose `texto:(...)` al PARSEAR: quien ya lo tenía escrito o
  // guardado no pierde nada. Solo dejó de generarse.
  //
  // Va al final: es lo que más se reescribe.
  const free = String(record(filters)[syntax.freeText.field] ?? "").trim()
  if (free) terms.push(free)

  return terms.join(" ")
}

/** El texto del input → filtros. Inversa de `buildQuery`. */
export function parseQuery<F extends object>(syntax: QuerySyntax<F>, query: string): F {
  let draft = { ...syntax.empty }
  let hasFreeTerm = false

  // Lo que quede fuera de los términos es la búsqueda libre.
  const rest = query.replace(TERM_RE, (match, rawKey: string, rawValue: string) => {
    const key = normalizeKey(rawKey)
    const value = rawValue.trim()

    if (key === normalizeKey(syntax.freeText.key)) {
      draft = patched(draft, { [syntax.freeText.field]: value } as Partial<F>)
      hasFreeTerm = true
      return ""
    }

    const term = syntax.terms.find((candidate) => normalizeKey(candidate.key) === key)
    const patch = term
      ? term.fromValue(value, draft)
      : syntax.wildcard?.fromTerm(rawKey, value, draft)

    if (!patch) {
      // La clave EXISTE pero el valor todavía no resuelve — se está tecleando,
      // o el catálogo de opciones no cargó. Se consume igual: no aporta filtro,
      // pero tampoco debe caer a la búsqueda libre. Si cayera, `rol:(Auxiliar)`
      // pasaría a buscar esa cadena literal en los nombres, que no es lo que
      // pidió nadie, y al reescribirse quedaría anidado dentro del texto.
      //
      // Lo tecleado no se pierde: el input es estado propio, esto solo decide
      // qué filtros salen de él.
      if (term) return ""
      // Clave desconocida: sí es texto libre — alguien escribió algo con dos
      // puntos que no es un término de este buscador.
      return match
    }

    draft = patched(draft, patch)
    return ""
  })

  // Escribir texto suelto, sin clave, sigue valiendo como búsqueda libre: es
  // lo que espera quien no conoce la sintaxis. El término explícito manda si
  // están los dos.
  if (!hasFreeTerm) {
    const free = rest.replace(/\s+/g, " ").trim()
    draft = patched(draft, { [syntax.freeText.field]: free } as Partial<F>)
  }

  return draft
}

/**
 * ¿Dos conjuntos de filtros dicen lo mismo? Se comparan por su consulta, que
 * es la representación canónica: si se escriben igual, filtran igual. Se usa
 * para no pisar lo tecleado cuando el texto ya significa lo que hay en la URL
 * (si no, normalizar el espaciado movería el cursor al final en cada tecla).
 */
export function sameFilters<F extends object>(syntax: QuerySyntax<F>, a: F, b: F): boolean {
  return buildQuery(syntax, a) === buildQuery(syntax, b)
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers para declarar términos
// ───────────────────────────────────────────────────────────────────────────

interface TextTermOptions {
  /** Valor guardado → texto en el input (p. ej. `3` → `3°`). */
  format?: (value: string) => string
  /** Texto escrito → valor guardado; `undefined` lo deja como texto libre. */
  parse?: (text: string) => string | undefined
}

/** Campo de texto libre con clave: `nombre:(Ana)`. */
export function textTerm<F extends object>(
  key: string,
  field: keyof F & string,
  { format, parse }: TextTermOptions = {},
): QueryTerm<F> {
  return {
    key,
    toValues: (filters) => {
      const value = String(record(filters)[field] ?? "").trim()
      if (!value) return []
      return [format ? format(value) : value]
    },
    fromValue: (value) => {
      if (!parse) return { [field]: value } as Partial<F>
      const parsed = parse(value)
      return parsed === undefined ? undefined : ({ [field]: parsed } as Partial<F>)
    },
  }
}

/** Campo de una sola opción: `estado:(Activo)`. */
export function optionTerm<F extends object>(
  key: string,
  field: keyof F & string,
  options: QueryOption[],
): QueryTerm<F> {
  return {
    key,
    toValues: (filters) => {
      const value = String(record(filters)[field] ?? "")
      if (!value) return []
      // Catálogo todavía sin cargar: ver la nota en `optionsTerm`.
      if (options.length === 0) return []
      return [labelOf(options, value)]
    },
    fromValue: (value) => {
      // Campo de un solo valor: una parcial ambigua ("Aux" con dos roles que
      // empiezan igual) no se puede resolver sin elegir por el usuario, así
      // que no se filtra hasta que lo escrito identifique una sola opción.
      const matches = matchOptions(options, value)
      return matches.length === 1 ? ({ [field]: matches[0]!.value } as Partial<F>) : undefined
    },
  }
}

/** Campo multivalor: un término por opción elegida. */
export function optionsTerm<F extends object>(
  key: string,
  field: keyof F & string,
  options: QueryOption[],
): QueryTerm<F> {
  return {
    key,
    toValues: (filters) =>
      // Con el catálogo vacío no se omite por prolijidad: es que todavía no
      // se SABE la etiqueta. Caer al valor crudo acá pinta el id en el input
      // (`estado:(533)`) y encima se queda pegado — cuando el catálogo llega,
      // la guarda de `useQuerySearch` ve que ese texto significa lo mismo que
      // los filtros (matchOption también matchea por `value`) y no lo
      // reescribe nunca. El término aparece solo, ya con su etiqueta, apenas
      // carga el catálogo.
      //
      // Distinto del caso de abajo (`labelOf`): ahí el catálogo SÍ está y el
      // valor no figura, que es un dato real y conviene mostrarlo.
      options.length === 0
        ? []
        : valuesOf(filters, field).map((value) => labelOf(options, value)),
    fromValue: (value, draft) => {
      const matches = matchOptions(options, value)
      if (matches.length === 0) return undefined
      const current = valuesOf(draft, field)
      const nuevos = matches.map((o) => o.value).filter((v) => !current.includes(v))
      if (nuevos.length === 0) return {}
      return { [field]: [...current, ...nuevos] } as Partial<F>
    },
  }
}

// ───────────────────────────────────────────────────────────────────────────

// Las claves se comparan sin mayúsculas ni tildes: quien escribe `operacion`
// quiere decir `operación`, y obligarlo a poner el acento sería un filtro que
// no funciona sin razón visible.
function normalizeKey(key: string): string {
  return key
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
}

/**
 * Qué opciones corresponden a lo que se escribió.
 *
 * El usuario escribe la etiqueta ("Activo"), no la clave ("A"); se acepta
 * cualquiera de las dos, sin distinguir mayúsculas ni tildes.
 *
 * Y acepta escribir de menos: `rol:(Auxiliar)` trae "Auxiliar administrativo".
 * Escribir el nombre completo de cada opción para filtrar por ella es un
 * requisito que nadie cumple — se tipea un pedazo y se espera que aparezca lo
 * que coincida, como en cualquier buscador.
 *
 * El orden importa: si lo escrito coincide EXACTO con alguna opción, esa gana
 * sola. Sin esa precedencia, un catálogo con "Activo" y "Activo temporal"
 * haría que escribir "Activo" filtrara por las dos y no hubiera forma de pedir
 * solo la primera.
 */
function matchOptions(options: QueryOption[], value: string): QueryOption[] {
  const needle = normalizeKey(value)
  if (!needle) return []

  const exactas = options.filter(
    (option) => normalizeKey(option.label) === needle || normalizeKey(option.value) === needle,
  )
  if (exactas.length > 0) return exactas

  return options.filter(
    (option) =>
      normalizeKey(option.label).includes(needle) || normalizeKey(option.value).includes(needle),
  )
}

// Un valor que ya no está en el catálogo se muestra crudo en vez de
// desaparecer del input: es preferible ver `estado:(XYZ)` a filtrar por algo
// que no se ve en ningún lado.
function labelOf(options: QueryOption[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

function valuesOf<F extends object>(filters: F, field: string): string[] {
  const value = record(filters)[field]
  return Array.isArray(value) ? (value as string[]) : []
}

function record<F extends object>(filters: F): Record<string, unknown> {
  return filters as Record<string, unknown>
}

function patched<F extends object>(draft: F, patch: Partial<F>): F {
  return { ...draft, ...patch }
}
