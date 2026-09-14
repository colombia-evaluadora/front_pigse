import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { unwrapRow } from "@/lib/response-envelope"
import { env } from "@/config/env"

import type { Employee } from "@/features/establishment/employees/api/types/employee"
import type { CatalogItem } from "@/types/catalog"

/** Solo el `id` -- sin nombre de catálogo en esta fila (a diferencia de los
 * `select` genéricos). El diálogo resuelve el nombre real cruzando contra la
 * lista del catálogo (`EmployeeAdditionalInfoForm`/`pickOption`). */
function toCatalogIdOnly(id: number | null): CatalogItem | null {
  return id === null ? null : { id, code: String(id), name: "" }
}

interface EmployeeQueryResult {
  status: "ok"
  employee: Employee
}

/** Fila cruda de `pigse.fn_fun_buscar_por_pk` (V390 en adelante incluye
 * "información complementaria" -- mismos 8 campos que CEVAL, ver
 * `form-employee-additional-info.tsx`). `fk_establecimiento`/`fk_tlv_cargo`
 * siguen viniendo (el establecimiento se deriva de la sede, ver
 * `fn_fun_permisos_actualizar`, y el cargo ya no se pide a mano -- lo cubre
 * el rol) pero ya no se exponen en `Employee`: no hay UI que los muestre. */
interface RealEmployeeDetailRow {
  pk_funcionario: number
  pk_usuario: number
  identificacion: string
  fk_tlv_tipo_documento: number | null
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  correo_electronico: string
  telefono: string | null
  fk_tlv_clase_funcionario: number | null
  fk_tlv_nivel_ensenanza: number | null
  fk_tlv_grado_escalafon: number | null
  fk_tlv_nivel_educativo: number | null
  fk_tlv_fuente_recurso: number | null
  fk_tlv_tipo_vinculacion: number | null
  fk_tlv_cargo_funcional: number | null
  direccion: string | null
  permisos: {
    id: number
    orden: number
    idRole: number
    nombre: string
    idSede: number
    sede: string
    idJornada: number
    jornada: string
    estado: "ACTIVO" | "INACTIVO"
  }[]
}

function toEmployee(row: RealEmployeeDetailRow): Employee {
  return {
    id: row.pk_funcionario,
    person: {
      id: row.pk_funcionario,
      // Sin nombre de catálogo en esta fila (a diferencia de los `select`
      // genéricos): el form solo necesita el `id` para preseleccionar la
      // opción correcta en el combobox de tipo de documento.
      documentType:
        row.fk_tlv_tipo_documento === null
          ? null
          : { id: row.fk_tlv_tipo_documento, code: String(row.fk_tlv_tipo_documento), name: "" },
      identification: row.identificacion,
      firstName: row.primer_nombre,
      middleName: row.segundo_nombre ?? "",
      lastName: row.primer_apellido,
      secondLastName: row.segundo_apellido ?? "",
      // pigse.TUSUARIO tiene FECHA_NACIMIENTO/FK_TLV_GENERO, pero
      // `fn_fun_buscar_por_pk` no los devuelve todavía — sin endpoint de
      // edición para esos dos, se dejan vacíos como el resto de formularios
      // sin ese dato.
      birthDate: "",
      gender: null,
      email: row.correo_electronico,
      phone: row.telefono ?? "",
      password: "",
    },
    employeeClass: toCatalogIdOnly(row.fk_tlv_clase_funcionario),
    educationLevel: toCatalogIdOnly(row.fk_tlv_nivel_ensenanza),
    grade: toCatalogIdOnly(row.fk_tlv_grado_escalafon),
    highestEducationLevel: toCatalogIdOnly(row.fk_tlv_nivel_educativo),
    fundingSource: toCatalogIdOnly(row.fk_tlv_fuente_recurso),
    functionalPosition: toCatalogIdOnly(row.fk_tlv_cargo_funcional),
    employmentType: toCatalogIdOnly(row.fk_tlv_tipo_vinculacion),
    address: row.direccion ?? "",
    // PIGSE ya tiene sedes + permisos rol+jornada+estado (V370) -- espejo de
    // CEVAL. `id` es el PK_TSEDE_USUARIO real, necesario para poder borrar
    // el permiso después (ver `dialog-manage.tsx`/`update-permissions.ts`).
    permissions: (row.permisos ?? []).map((permiso) => ({
      id: permiso.id,
      order: permiso.orden,
      role: { id: permiso.idRole, code: "", name: permiso.nombre },
      workSchedule: { id: permiso.idJornada, code: "", name: permiso.jornada },
      status: permiso.estado === "ACTIVO" ? ("ACTIVE" as const) : ("SUSPENDED" as const),
      campusId: permiso.idSede,
      campusName: permiso.sede,
    })),
    status: "ACTIVE",
  }
}

/**
 * Exportada aparte de `useEmployeeQuery`: la usa también el formulario de
 * establecimiento para hidratar rector/secretaria (que son TFUNCIONARIO
 * como cualquier otro, `fk_tfuncionario_rector`/`secretaria` de
 * `fn_est_buscar_por_pk` es el mismo `pk_funcionario` que espera
 * `fn_fun_buscar_por_pk`) fuera del ciclo de vida de un hook — se llama a
 * mano dentro de `fetchEstablishment`, no en un componente.
 */
export async function fetchEmployee(id: number): Promise<EmployeeQueryResult> {
  if (env.ENABLE_API_MOCKING) {
    return api.get(`/establishments/employees/${id}`)
  }

  // GET /funcionarios/:id (pigse) — fila cruda envuelta en {rows:[...]}.
  const row = unwrapRow<RealEmployeeDetailRow>(
    (await api.get(`/pigse/funcionarios/${id}`)) as unknown as
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
