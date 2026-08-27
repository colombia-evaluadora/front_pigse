/**
 * El front modela `sorting` como `SortingState` de TanStack (array, soporta
 * multi-sort) porque así lo espera `useDataTable`/`useTablePagination` — en
 * la práctica esta app nunca ordena por más de una columna a la vez, así
 * que siempre es `[]` o `[{id, desc}]`.
 *
 * El binding SQL del backend real resuelve `:BODY.SORTING.ID` /
 * `:BODY.SORTING.DESC` como propiedades de un objeto único, no de un array
 * — mandarle `[{...}]` rompe ese cast. Esto traduce solo en el borde de
 * salida (no toca `SortingState` ni la paginación de las tablas); el mock
 * sigue esperando el array tal cual.
 *
 * Nunca devuelve `null` a secas: el validador de placeholders de la
 * plataforma recorre el JSON del body y, si `sorting` es `null`, no puede
 * bajar a revisar `.id`/`.desc` contra los tipos declarados — reporta el
 * path completo (`BODY.SORTING`) como un placeholder sin tipo, aunque
 * `BODY.SORTING.ID`/`BODY.SORTING.DESC` sí estén declarados (pasa apenas se
 * carga la tabla sin ninguna columna ordenada todavía). Por eso, sin sort
 * activo, se manda igual un objeto con las dos claves en `null`/`false` —
 * el validador puede bajar a esos leaves, y `CAST(:BODY.SORTING.ID AS
 * VARCHAR)` con un JSON `null` castea a SQL `NULL` sin problema (mismo
 * comportamiento que ya usan el resto de los campos opcionales).
 */
export function toSingleSort<T extends { id: string; desc: boolean }>(
  sorting: T[],
): T | { id: null; desc: false } {
  return sorting[0] ?? { id: null, desc: false }
}
