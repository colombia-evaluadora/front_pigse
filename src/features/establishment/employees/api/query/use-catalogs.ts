import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { CATALOGS } from "@/lib/catalogs"
import { unwrapRows } from "@/lib/response-envelope"

/**
 * Slug de catálogo: el *valor* de cualquier entrada de `CATALOGS`
 * (p. ej. `"document-types"`, `"population-genders"`). Se usa como
 * parámetro de `getCatalog` y `useCatalogQuery` para que solo se
 * puedan pedir catálogos declarados en `CATALOGS`.
 */
export type CatalogSlug = (typeof CATALOGS)[keyof typeof CATALOGS]

/**
 * Mensajes legibles para mostrar cuando falla la carga de un catálogo.
 *
 * La clave es la constante de `CATALOGS` (no el string crudo) para que:
 *  - el IDE autocomplete al registrar una nueva entrada,
 *  - un rename en `CATALOGS` propague el cambio aquí sin tener que
 *    recordar editar el slug a mano,
 *  - el compilador señale referencias rotas si se elimina una clave.
 *
 * Es `Partial`: no es obligatorio registrar todos los catálogos. Si uno
 * no aparece, el `Error` simplemente muestra el slug crudo, que sigue
 * siendo información útil para debugging.
 */
const catalogNames: Partial<Record<CatalogSlug, string>> = {
  [CATALOGS.DOCUMENT_TYPES]: "los tipos de documento",
  [CATALOGS.EMPLOYEE_ROLES]: "los roles de empleado",
  [CATALOGS.GENDERS]: "los géneros",
  [CATALOGS.POPULATION_GENDERS]: "los géneros de la población",
  [CATALOGS.MUNICIPALITIES]: "los municipios",
  [CATALOGS.EDUCATION_LEVELS]: "los niveles educativos de enseñanza",
  [CATALOGS.HIGHEST_EDUCATION_LEVELS]: "los últimos niveles educativos aprobados",
  [CATALOGS.WORK_SCHEDULES]: "las jornadas laborales",
  [CATALOGS.EMPLOYEE_CLASSES]: "las clases de funcionario",
  [CATALOGS.EMPLOYEE_GRADES]: "los grados de escalafón",
  [CATALOGS.FUNDING_SOURCES]: "las fuentes de recursos",
  [CATALOGS.FUNCTIONAL_POSITIONS]: "los cargos funcionales",
  [CATALOGS.EMPLOYMENT_TYPES]: "los tipos de vinculación",
  [CATALOGS.CALENDARIOS]: "los calendarios",
  [CATALOGS.COST_REGIMEN]: "el régimen de costos",
  [CATALOGS.RANGO_TARIFAS]: "el rango de tarifas",
  [CATALOGS.IDIOMAS]: "los idiomas",
  [CATALOGS.LEGAL_TYPES]: "los tipos jurídicos",
  [CATALOGS.ZONES]: "las zonas",
  [CATALOGS.DISABILITIES]: "las discapacidades",
  [CATALOGS.LICENSE_STATUSES]: "los estados de licencia",
  [CATALOGS.ENTITY_STATUSES]: "los estados de entidad",
}

/**
 * Categoría real de `academico_test.tlista_valor` (columna `CATEGORIA`)
 * detrás de cada slug de `CATALOGS` — usada solo para armar
 * `GET /select/:categoria` cuando NO se está mockeando (ver `getCatalog`
 * más abajo). El catálogo genérico real vive en dos endpoints:
 *   `GET /select`            -> lista las categorías existentes.
 *   `GET /select/:categoria` -> lista {pk_lista_valor, nombre, valor,
 *                                accion} de esa categoría.
 * Confirmado contra la base real (id_query 8 y 9).
 *
 * Deliberadamente AUSENTES de este mapeo (no son TLISTA_VALOR, tienen su
 * propia tabla real y su propio endpoint dedicado — ver V58 en el SSO):
 *   - MUNICIPALITIES  -> usar `useMunicipalitiesQuery` (útil ADEMÁS trae
 *                        el departamento anidado, que esto no podría dar).
 *   - LEGAL_TYPES     -> usar `useOwnershipTypesQuery` (TPROPIEDAD_JURIDICA).
 *   - DISABILITIES    -> usar `useDisabilityTypesQuery` (TDISCAPACIDAD).
 *   - EMPLOYEE_ROLES  -> usar `useEmployeeRolesQuery` (TROL, PK_TROL >= 9 —
 *                        1..8 son roles de sistema, no de funcionario normal).
 */
const CATALOG_CATEGORIAS: Partial<Record<CatalogSlug, string>> = {
  [CATALOGS.DOCUMENT_TYPES]: "TIPO_DOCUMENTO",
  [CATALOGS.GENDERS]: "GENERO",
  [CATALOGS.POPULATION_GENDERS]: "GENERO_POBLACION",
  [CATALOGS.WORK_SCHEDULES]: "JORNADA",
  [CATALOGS.EMPLOYEE_CLASSES]: "CLASE_FUNCIONARIO",
  [CATALOGS.FUNDING_SOURCES]: "FUENTE_DE_RECURSO",
  [CATALOGS.EMPLOYMENT_TYPES]: "TIPO_VINCULACION",
  [CATALOGS.CALENDARIOS]: "CALENDARIO",
  [CATALOGS.COST_REGIMEN]: "REG_COSTOS",
  [CATALOGS.RANGO_TARIFAS]: "RANG_TARIFA",
  [CATALOGS.IDIOMAS]: "IDIOMA",
  [CATALOGS.ZONES]: "ZONA",
  // Confirmado 1:1 con el ejemplo de payload real que se uso para diseñar
  // este mapeo (pk_lista_valor 533="Activo", 534="Inactivo", etc.).
  [CATALOGS.ENTITY_STATUSES]: "ESTADO_ESTABLECIMIENTO",
  // "Nivel educativo de enseñanza" del funcionario (FK_TLV_NIVEL_ESENANZA).
  [CATALOGS.EDUCATION_LEVELS]: "NIVEL_ENSENANZA",
  // "Último nivel educativo aprobado" del funcionario (FK_TLV_NIVEL_EDUCATIVO)
  // — antes compartía categoría con EDUCATION_LEVELS, ahora separado.
  [CATALOGS.HIGHEST_EDUCATION_LEVELS]: "ULT_NIVEL",
  // "Grado escalafón".
  [CATALOGS.EMPLOYEE_GRADES]: "ESCALAFON",
  // "Cargo funcional".
  [CATALOGS.FUNCTIONAL_POSITIONS]: "NOMBRE_CARGO",
}

/** Forma real de cada fila de `GET /select/:categoria` (tlista_valor). */
interface RealCatalogRow {
  pk_lista_valor: number
  nombre: string
  valor: string
  accion: string | null
}

async function getMockCatalog<T>(catalog: CatalogSlug): Promise<T[]> {
  const response = await fetch(`/api/catalogs/${catalog}`)

  if (!response.ok) {
    const friendly = catalogNames[catalog] ?? catalog
    throw new Error(`No fue posible obtener ${friendly}`)
  }

  return response.json()
}

async function getRealCatalog<T>(catalog: CatalogSlug): Promise<T[]> {
  const categoria = CATALOG_CATEGORIAS[catalog]
  if (!categoria) {
    throw new Error(
      `El catálogo "${catalog}" todavía no tiene categoría real mapeada (ver CATALOG_CATEGORIAS en use-catalogs.ts)`,
    )
  }

  const friendly = catalogNames[catalog] ?? catalog
  try {
    // `api` (no `fetch` crudo): el interceptor de `api-client.ts` es el que
    // agrega `Authorization: Bearer <token>` — sin él, el gateway real
    // rechaza la petición con 403 antes de llegar a la query. `fetch()`
    // directo nunca llevaba ese header.
    const response = (await api.get(`/pigse/select/${categoria}`)) as unknown as
      | { rows: RealCatalogRow[] }
      | RealCatalogRow[]
    const rows = unwrapRows<RealCatalogRow>(response)
    return rows.map((row) => ({
      id: row.pk_lista_valor,
      code: row.valor,
      name: row.nombre,
    })) as T[]
  } catch {
    throw new Error(`No fue posible obtener ${friendly}`)
  }
}

export function getCatalog<T>(catalog: CatalogSlug): Promise<T[]> {
  return env.ENABLE_API_MOCKING ? getMockCatalog<T>(catalog) : getRealCatalog<T>(catalog)
}

export function useCatalogQuery<T>(catalog: CatalogSlug) {
  return useQuery({
    queryKey: ["catalogs", catalog],
    queryFn: () => getCatalog<T>(catalog),
  })
}
