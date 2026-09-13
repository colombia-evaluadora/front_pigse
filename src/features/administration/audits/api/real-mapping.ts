/**
 * Traducciones entre lo que espera la UI de auditoría y lo que realmente
 * sirve el backend (instancia `audit-clickhouse` del query-service,
 * registrada en V84 con `requesturi = /api/audit-ch/**`; las filas de
 * catálogo son V85 para `/audit-tables/*` y V86+V90 para `/audits/*`).
 *
 * Este módulo existe porque el contrato real se apartó de la spec del mock
 * en cinco puntos concretos, todos documentados en las cabeceras de esas
 * migraciones y en `SSO/docs/auditoria-*.md`:
 *
 * 1. **No hay catálogo de tablas auditables.** `slug`/`name` se DERIVAN del
 *    nombre crudo de la tabla Postgres con una fórmula determinista
 *    (`tperiodo_academico` ⇄ `tPeriodoAcademico`); `icon` es fijo
 *    (`Table-Icon`) y `fields` (los campos legibles) no existe.
 * 2. **`filters.operations` es un solo valor**, no un array: el bind de
 *    arrays contra ClickHouse todavía no está validado, así que la fila de
 *    catálogo declara `BODY.FILTERS.OPERATIONCH` como VARCHAR.
 * 3. **No hay paginación ni ordenamiento server-side.** ClickHouse exige
 *    que `LIMIT`/`OFFSET` sean literales constantes en el texto SQL
 *    (bindearlos falla con "LIMIT expression must be constant"), así que
 *    todas las queries traen un `LIMIT 100` fijo y un `ORDER BY` fijo.
 *    `pageIndex`/`pageSize`/`sorting` viajan igual (están declarados) pero
 *    el SQL los ignora — paginar y ordenar es responsabilidad del cliente
 *    sobre esa ventana de 100 filas.
 * 4. **El diff campo-por-campo no viene armado**: `/changes` devuelve
 *    `beforeRaw`/`afterRaw`/`currentRaw`, el JSON crudo de
 *    `fila_old`/`fila_new`, y el diff lo arma la capa de aplicación (acá).
 * 5. **`entityFields` llega como JSON crudo** (`entityFieldsRaw`), con los
 *    nombres de columna de Postgres, no con etiquetas legibles.
 *
 * El body que se manda tiene que contener EXACTAMENTE las claves declaradas
 * en `param_types` de cada fila de catálogo: `QueryService` aplana el JSON
 * del body a `BODY.X.Y` y rechaza con 400 cualquier placeholder
 * caller-controlled sin tipo declarado. Por eso cada hook arma su body clave
 * por clave, en vez de hacer spread de los filtros de la UI.
 */
import type { SortingState } from "@tanstack/react-table"

import type { FieldFilter } from "@/features/administration/audits/api/schema"
import type { ExportResult } from "@/features/administration/audits/api/types/audit"
import type { OperationChange, OperationType } from "@/features/administration/audits/api/types/audit-table"

/**
 * Los diálogos de exportación siguen existiendo, pero contra el backend real
 * no hay a quién pedirle el archivo: no hay ninguna clave de auditoría en el
 * catálogo del `reporting-service` (ver `ReportKey` en `lib/report-client.ts`)
 * ni una fila `.../reporte` en `public.query` para estos endpoints. Se
 * devuelve este resultado en vez de pegarle a un endpoint inexistente y
 * mostrar un 404 crudo.
 */
export const AUDIT_EXPORT_UNAVAILABLE: ExportResult = {
  status: "error",
  message: "La exportación de auditoría todavía no está disponible en el backend.",
}

/** Ícono único que devuelve V85 mientras no exista `audit_table_catalog`. */
export const DEFAULT_AUDIT_TABLE_ICON = "Table-Icon"

/**
 * `tgrado` → `tGrado`, `tperiodo_academico` → `tPeriodoAcademico`.
 * Misma fórmula que el CTE `catalogo` de V85 §1.1, reimplementada acá para
 * los endpoints que devuelven el nombre crudo (`/audits/sessions/{id}/operations`
 * expone `tabla` tal cual en su columna `tableSlug`).
 */
export function tableNameToSlug(tableName: string): string {
  return (
    "t" +
    tableName
      .slice(1)
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join("")
  )
}

/** `tPeriodoAcademico` → `Periodo Academico` (sin tildes: la fórmula no las inventa). */
export function tableNameToLabel(tableName: string): string {
  return tableName
    .slice(1)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ")
}

/** Inversa de `tableNameToSlug` — la misma que hace el SQL en el `WHERE tabla = ...`. */
export function slugToTableName(slug: string): string {
  return "t" + slug.slice(1).replace(/([A-Z])/g, "_$1").toLowerCase().slice(1)
}

/**
 * El filtro de operaciones del backend acepta UN valor (ver §2 de la
 * cabecera). Cuando la UI seleccionó varias, se manda vacío —traer de más y
 * recortar en el cliente— en vez de elegir una arbitrariamente y ocultarle
 * filas al usuario.
 */
export function toOperationCh(operations?: OperationType[]): string {
  return operations?.length === 1 ? operations[0] : ""
}

/**
 * ClickHouse no hace short-circuit del `OR`, así que el SQL del catálogo
 * llama `parseDateTimeBestEffort` sobre el valor SIEMPRE y usa `if(x = '')`
 * para neutralizarlo. Un `undefined` que viaje como `null` en el JSON haría
 * fallar esa comparación, así que el borde de salida normaliza a `""`.
 */
export function toBind(value?: string | null): string {
  return value ?? ""
}

/**
 * ClickHouse devuelve `DateTime` como `"2026-08-24 10:15:00"`, que
 * `new Date(...)` interpreta distinto según el navegador (y en Safari da
 * `Invalid Date`). Las columnas de las tablas hacen `new Date(valor)`
 * directo, así que se normaliza acá al ISO que sí es portable.
 */
export function toIsoDateTime(value: string | null | undefined): string | null {
  if (!value) return null
  return value.includes(" ") ? value.replace(" ", "T") : value
}

/** JSON crudo de `fila_new`/`fila_old` → mapa de campo a valor mostrable. */
export function parseRawRow(raw: string | null | undefined): Record<string, string | null> {
  if (!raw) return {}
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).map(([key, value]) => [
        key,
        value === null || value === undefined ? null : String(value),
      ]),
    )
  } catch {
    // Una fila con JSON inválido no debe tumbar la tabla entera: la
    // operación igual se muestra, solo sin snapshot de campos.
    return {}
  }
}

/**
 * Arma el diff campo a campo que la UI espera a partir de los tres JSON
 * crudos que devuelve `/changes` (`fila_old`, `fila_new`, y el `fila_new` de
 * la operación más reciente sobre la misma fila).
 *
 * El orden de los campos define `fieldIndex`, que la spec del mock pide que
 * sea estable entre requests porque el cliente lo devuelve al revertir. Se
 * ordena alfabéticamente —y no por el orden de las claves del JSON, que
 * depende de cómo Debezium serializó esa fila puntual— para que el índice no
 * cambie entre dos operaciones de la misma tabla.
 *
 * (Hoy ese `fieldIndex` no llega a viajar: el revert real identifica el
 * cambio por `(lsn, seq)` y solo soporta el patrón soft-delete — ver
 * `revert-operation-change.ts`.)
 */
export function buildChanges(
  before: Record<string, string | null>,
  after: Record<string, string | null>,
  current: Record<string, string | null>,
): OperationChange[] {
  const fields = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()
  return fields.map((field, fieldIndex) => ({
    fieldIndex,
    field,
    before: before[field] ?? null,
    after: after[field] ?? null,
    current: current[field] ?? null,
  }))
}

/**
 * Aplica los filtros ad-hoc por campo del sheet sobre el snapshot que trajo
 * la operación.
 *
 * El backend no puede resolverlos: cada `fieldFilter` necesitaría su propio
 * `JSONExtractString(fila_new_raw, '<columna>')` en el SQL, y la fila de
 * catálogo es estática y compartida por las 147 tablas (V85, "no escala vía
 * SQL estático"). Se resuelven acá, sobre las columnas crudas que ya vienen
 * en `entityFieldsRaw`.
 *
 * El match del nombre de campo es case-insensitive porque el usuario elige
 * de una lista derivada de esas mismas claves crudas y no debería importar
 * la caja con que Debezium las serializó.
 */
export function matchesFieldFilters(
  entityFields: Record<string, string | null>,
  fieldFilters?: FieldFilter[],
): boolean {
  if (!fieldFilters?.length) return true

  const normalized = new Map(
    Object.entries(entityFields).map(([key, value]) => [key.toLowerCase(), value ?? ""]),
  )

  return fieldFilters.every(({ field, condition, value }) => {
    const actual = (normalized.get(field.toLowerCase()) ?? "").toLowerCase()
    const expected = value.toLowerCase()
    if (condition === "equals") return actual === expected
    if (condition === "startsWith") return actual.startsWith(expected)
    return actual.includes(expected)
  })
}

/**
 * Ordena en el cliente la ventana que devolvió el backend (§3 de la
 * cabecera). Solo se soporta un criterio, que es lo único que la UI produce.
 */
export function sortWindow<T>(rows: T[], sorting: SortingState): T[] {
  const sort = sorting[0]
  if (!sort) return rows
  const factor = sort.desc ? -1 : 1
  return [...rows].sort((a, b) => {
    const left = (a as Record<string, unknown>)[sort.id]
    const right = (b as Record<string, unknown>)[sort.id]
    if (left === right) return 0
    if (left === null || left === undefined) return 1
    if (right === null || right === undefined) return -1
    if (typeof left === "number" && typeof right === "number") return (left - right) * factor
    return String(left).localeCompare(String(right)) * factor
  })
}

export interface WindowedPage<T> {
  rows: T[]
  pageCount: number
  totalCount: number
}

/**
 * Pagina en el cliente sobre la ventana ya traída.
 *
 * `totalCount` es el largo de la ventana, NO el `totalCount` que calcula el
 * `count() OVER()` del SQL: ese cuenta todas las filas que matchean el
 * filtro (puede ser mucho mayor que 100), y mostrarlo mientras solo 100 son
 * navegables haría que la paginación se contradiga con el contador. Cuando
 * el catálogo resuelva el `LIMIT`/`OFFSET` bindeado (marcado 🔶 en V85),
 * esto se reemplaza por paginación real.
 */
export function paginateWindow<T>(rows: T[], pageIndex: number, pageSize: number): WindowedPage<T> {
  const start = pageIndex * pageSize
  return {
    rows: rows.slice(start, start + pageSize),
    pageCount: Math.max(1, Math.ceil(rows.length / pageSize)),
    totalCount: rows.length,
  }
}
