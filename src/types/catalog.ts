/**
 * Catálogo genérico cargado de un endpoint del tipo `SELECT id, code, name FROM catalogo`.
 *
 * Lo que define un catálogo (id numérico, código legible de dos letras, nombre
 * humano) es el mismo para todos los features que pintan un select poblado
 * desde una `fn_*_listar` del backend, así que el tipo vive en `src/types/` y
 * no acoplado a un feature particular.
 *
 * Si un catálogo concreto necesita un campo extra (p.ej. un catálogo jerárquico
 * con `idParent`), se modela como un `interface` que extiende `CatalogItem` en
 * el archivo del feature — sin tener que duplicar este shape.
 */
export interface CatalogItem {
  id: number
  code: string
  name: string
}
