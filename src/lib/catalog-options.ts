/**
 * Dos convenciones, según a dónde va el valor elegido.
 *
 * En los FORMULARIOS (`toSelectOptions`) el `value` es el `id`: ahí se está
 * creando o editando una entidad y la referencia al catálogo se guarda por
 * llave primaria.
 *
 * En los FILTROS (`toSearchOptions`) el `value` es el `code`. El id es interno
 * y no tiene por qué ser parte del contrato con el cliente: atarlo obliga a
 * que cualquier consumidor conozca las llaves de la base, y encima se filtra
 * en la URL y en el buscador, donde `estado:(533)` no le dice nada a nadie.
 * Con el código se lee `estado:(A)` y el backend resuelve el id (ver V116).
 *
 * El parámetro pide solo `{id, name}` (no `CatalogItem` completo) para que
 * sirva también con formas más chicas que comparten esas dos claves —
 * `EstablishmentOption`, filas de catálogos "propios" (roles, municipios,
 * discapacidades, etc.) — sin forzarlas a llevar un `code` que no tienen.
 */
export interface SelectOption<TValue> {
  value: TValue
  label: string
}

interface IdNamed {
  id: number
  name: string
}

interface CodeNamed {
  code: string
  name: string
}

/** Para un `<Select>` de formulario normal — `value` numérico. */
export function toSelectOptions(items: IdNamed[]): SelectOption<number>[] {
  return items.map((item) => ({ value: item.id, label: item.name }))
}

/**
 * Para los filtros: barra de búsqueda (`optionsTerm`/`QueryOption`) y los
 * `<Select>` del popover de filtros avanzados, que alimentan el mismo estado.
 *
 * Pide `{code, name}` y no `{id, name}` a propósito: el tipo es lo que impide
 * que un catálogo sin código se cuele en un filtro y termine mandando
 * `undefined` al backend.
 */
export function toSearchOptions(items: CodeNamed[]): SelectOption<string>[] {
  return items.map((item) => ({ value: item.code, label: item.name }))
}

/**
 * El `<Select>` compartido (`ui/select.tsx`) solo resuelve la etiqueta del
 * valor elegido cuando `items` es un `Record<value, label>` — un *array*
 * de `{value, label}` (lo que devuelven `toSelectOptions`/`toSearchOptions`,
 * y lo que hace falta para iterar `<SelectItem>`) lo pasa tal cual a Base UI
 * y el trigger se queda sin poder mostrar el label (cae al valor crudo o al
 * placeholder). Por eso todo `<Select items={...}>` necesita este mapa
 * además del array — el array sigue sirviendo para pintar las opciones.
 */
export function toSelectItemsMap<TValue extends string | number>(
  options: SelectOption<TValue>[],
): Record<string, string> {
  return Object.fromEntries(options.map((option) => [String(option.value), option.label]))
}
