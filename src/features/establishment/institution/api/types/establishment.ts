import type { CatalogItem } from "@/types/catalog"
import type { Municipality } from "@/features/establishment/institution/api/types/location"
import type { Person } from "@/features/establishment/employees/api/types/person"

/**
 * `id` del catálogo real `ESTADO_ESTABLECIMIENTO` (`TLISTA_VALOR.PK_LISTA_
 * VALOR`, como texto), no un enum fijo del front: el dominio real tiene 5
 * valores (Activo, Inactivo, Suspendido, Suspensión de chat por mora,
 * Suspendido temporalmente), no 2. Es el mismo espacio de valores que usa
 * el filtro de estado (`<Select>` de búsqueda) — así el filtro y la fila
 * comparan directo, sin resolver nada contra ningún catálogo. Mock: id del
 * fixture `ENTITY_STATUSES` (1=Activo, 2=Suspendido), también como texto.
 */
export type EstablishmentStatus = string

export interface Establishment {
  id: number
  dane: string
  name: string
  department: string
  municipality: string
  // `fk_tlv_estado_establecimiento` es nullable en pigse.TESTABLECIMIENTO
  // (V387) -- un establecimiento sin estado asignado todavía manda null.
  status: EstablishmentStatus | null
  /** Nombre para mostrar (real: `estado_nombre`; mock: `ENTITY_STATUSES.name`)
   * — `status` es el id, no es legible por sí solo. */
  statusLabel: string | null
}

export interface EstablishmentDetails {
  /** Ausente hasta que el backend lo asigna (POST /establishments). */
  id?: number

  basicInfo: EstablishmentBasicInfo

  address: EstablishmentAddress

  contact: EstablishmentContact

  additionalInfo: EstablishmentAdditionalInfo

  principal: Person | null

  secretary: Person | null
}

export interface EstablishmentBasicInfo {
  name: string

  dane: string

  nit: string

  ownershipType: CatalogItem | null

  /**
   * `pk_tarchivo` del escudo ya cargado (`TESTABLECIMIENTO.FK_TARCHIVO`).
   * Solo de LECTURA: para verlo se pasa a `ArchivoImage`, que resuelve el
   * token de vista. Al guardar no viaja en el JSON — el escudo se manda como
   * el archivo `logo` del multipart y es `file-service` quien escribe esta
   * columna. Ausente en alta, y `null` si el EE no tiene escudo.
   */
  logoArchivoId?: number | null
}

export interface EstablishmentAddress {
  municipality: Municipality | null

  zone: CatalogItem | null

  district: CatalogItem | null

  commune: CatalogItem | null

  locality: CatalogItem | null

  address: string
}

export interface EstablishmentContact {
  email: string

  website: string

  phone: string

  fax?: string
}

export interface EstablishmentAdditionalInfo {
  approvalResolution: string

  teachingLanguage: CatalogItem | null

  calendar: CatalogItem | null

  costRegime: CatalogItem | null

  populationGender: CatalogItem | null

  tuitionRange: CatalogItem | null

  disabilityType: CatalogItem | null

  operatingLicense: boolean

  /** Texto libre (`LICENCIA_FUNCIONAMIENTO` es VARCHAR en la base, no un catálogo). */
  licenseStatus: string

  licenseDate: string | null

  ethnicAttention: boolean

  giftedAttention: boolean

  subsidy: boolean
}

export interface EstablishmentsQueryFilters {
  search?: string
  department?: string[]
  municipality?: string[]
  status?: EstablishmentStatus[]
}

export interface EstablishmentsQueryRequest {
  filters: EstablishmentsQueryFilters
  sorting: {
    id: string
    desc: boolean
  }[]
  pageIndex: number
  pageSize: number
}

export interface EstablishmentsQueryResponse {
  rows: Establishment[]
  pageCount: number
  totalCount: number
}

export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}
