import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { unwrapRow } from "@/lib/response-envelope"
import { env } from "@/config/env"

import type { CatalogItem } from "@/types/catalog"
import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type {
  Permission,
  PermissionStatus,
} from "@/features/establishment/institution/api/types/permission"

interface EmployeeQueryResult {
  status: "ok"
  employee: Employee
}

/** Sub-objetos que `fn_usu_empleado_buscar_por_pk` ya arma como JSONB con
 * la misma forma que el front espera (camelCase) — no hace falta remapear
 * sus claves, solo tolerar los `null` que el backend sí puede mandar donde
 * el front pide `string`/`CatalogItem`. */
interface RealPermissionRow {
  id: number
  orden: number
  role: CatalogItem
  workSchedule: CatalogItem
  status: PermissionStatus
}

/** Una fila de `fn_usu_empleado_buscar_por_pk` (columnas snake_case, cada
 * catálogo llega como `fk_x` + `x_nombre` sueltos, no anidados). */
interface RealEmployeeDetailRow {
  pk_empleado: number
  fk_tlv_tipo_documento: number | null
  tipo_documento_nombre: string | null
  identificacion: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha_nacimiento: string | null
  fk_tlv_genero: number | null
  genero_nombre: string | null
  correo_electronico: string | null
  telefono: string | null
  fk_estado: string
  estado_label: string
  fk_establecimiento: number | null
  fk_tlv_clase_funcionario: number | null
  clase_funcionario_nombre: string | null
  fk_tlv_nivel_esenanza: number | null
  nivel_esenanza_nombre: string | null
  fk_tlv_grado_escalafon: number | null
  grado_escalafon_nombre: string | null
  fk_tlv_nivel_educativo: number | null
  nivel_educativo_nombre: string | null
  fk_tlv_fuente_recurso: number | null
  fuente_recurso_nombre: string | null
  fk_tlv_cargo: number | null
  cargo_nombre: string | null
  fk_tlv_tipo_vinculacion: number | null
  tipo_vinculacion_nombre: string | null
  direccion: string | null
  /** `TUSUARIO.FK_TARCHIVO` — REV2 de `fn_usu_empleado_buscar_por_pk`. */
  fk_tarchivo_foto: number | null
  permisos: RealPermissionRow[]
}

/** `{id, name}` sin `code`: estas columnas del detalle no traen un código
 * de catálogo aparte (a diferencia de los selects genéricos), así que se
 * arma con el `fk_x` como `id`/`code` — mismo criterio que otros catálogos
 * "sueltos" del front que solo necesitan mostrar el nombre. */
function toCatalogItem(id: number | null, name: string | null): CatalogItem | null {
  if (id === null || name === null) return null
  return { id, code: String(id), name }
}

function toPermission(row: RealPermissionRow): Permission {
  return {
    id: row.id,
    order: row.orden,
    role: row.role,
    workSchedule: row.workSchedule,
    status: row.status,
  }
}

function toEmployee(row: RealEmployeeDetailRow): Employee {
  return {
    id: row.pk_empleado,
    person: {
      id: row.pk_empleado,
      documentType: toCatalogItem(row.fk_tlv_tipo_documento, row.tipo_documento_nombre),
      identification: row.identificacion,
      firstName: row.primer_nombre,
      middleName: row.segundo_nombre ?? "",
      lastName: row.primer_apellido,
      secondLastName: row.segundo_apellido ?? "",
      birthDate: row.fecha_nacimiento ?? "",
      gender: toCatalogItem(row.fk_tlv_genero, row.genero_nombre),
      email: row.correo_electronico ?? "",
      phone: row.telefono ?? "",
      // El backend nunca devuelve el hash (ver comentario de la función);
      // se deja vacío, igual que en el resto de formularios de edición.
      password: "",
      photoArchivoId: row.fk_tarchivo_foto,
    },
    employeeClass: toCatalogItem(row.fk_tlv_clase_funcionario, row.clase_funcionario_nombre),
    educationLevel: toCatalogItem(row.fk_tlv_nivel_esenanza, row.nivel_esenanza_nombre),
    grade: toCatalogItem(row.fk_tlv_grado_escalafon, row.grado_escalafon_nombre),
    highestEducationLevel: toCatalogItem(row.fk_tlv_nivel_educativo, row.nivel_educativo_nombre),
    fundingSource: toCatalogItem(row.fk_tlv_fuente_recurso, row.fuente_recurso_nombre),
    functionalPosition: toCatalogItem(row.fk_tlv_cargo, row.cargo_nombre),
    employmentType: toCatalogItem(row.fk_tlv_tipo_vinculacion, row.tipo_vinculacion_nombre),
    address: row.direccion ?? "",
    permissions: (row.permisos ?? []).map(toPermission),
    status: row.fk_estado === "A" ? "ACTIVE" : "SUSPENDED",
  }
}

/**
 * Exportada aparte de `useEmployeeQuery`: la usa también el formulario de
 * establecimiento para hidratar rector/secretaria (que son TFUNCIONARIO
 * como cualquier otro, `fk_tfuncionario_rector`/`secretaria` de
 * `fn_est_buscar_por_pk` es el mismo `pk_empleado` que espera
 * `fn_usu_empleado_buscar_por_pk`) fuera del ciclo de vida de un hook —
 * se llama a mano dentro de `fetchEstablishment`, no en un componente.
 */
export async function fetchEmployee(id: number): Promise<EmployeeQueryResult> {
  if (env.ENABLE_API_MOCKING) {
    return api.get(`/establishments/employees/${id}`)
  }

  // fn_usu_empleado_buscar_por_pk (V51) — fila cruda envuelta en {rows:[...]}.
  const row = unwrapRow<RealEmployeeDetailRow>(
    (await api.get(`/eval-col/establecimientos/funcionarios/${id}`)) as unknown as
      | { rows: RealEmployeeDetailRow[] }
      | RealEmployeeDetailRow,
  )
  return { status: "ok", employee: toEmployee(row) }
}

export function useEmployeeQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: () => fetchEmployee(id as number),
    enabled: enabled && Boolean(id),
  })
}
