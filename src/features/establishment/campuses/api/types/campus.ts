import type { CatalogItem } from "@/features/establishment/employees/api/types/catalog"

export interface Campus {
  id: number
  name: string
  dane: string
  zone: CatalogItem | null
  neighborhood: string
  commune: string
  address: string
  phone: string
}

/**
 * Forma del formulario antes del primer guardado: sin `id`, lo asigna el
 * backend al crear (POST /establishments/campuses). Una `Campus` ya cargada
 * (edición) también encaja acá — trae `id` de más, que no molesta.
 *
 * `establishmentId`: `FK_TESTABLECIMIENTO` es obligatorio en el alta real
 * (`fn_sed_crear`) e inmutable después — solo se pide en el formulario de
 * alta, y solo aparece el selector cuando el usuario logueado es super
 * admin (los demás roles solo pueden crear sedes en su propio EE).
 */
export type CampusDraft = Omit<Campus, "id"> & { establishmentId: number | null }

/** Opción liviana para el selector de establecimiento (super admin). */
export interface EstablishmentOption {
  id: number
  name: string
}

export interface CampusesQueryFilters {
  search?: string
  zones?: string[]
}

export interface CampusesQueryRequest {
  filters: CampusesQueryFilters
  sorting: {
    id: string
    desc: boolean
  }[]
  pageIndex: number
  pageSize: number
}

export interface CampusesQueryResponse {
  rows: Campus[]
  pageCount: number
  totalCount: number
}