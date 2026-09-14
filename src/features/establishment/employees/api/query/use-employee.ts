import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api-client"
import { unwrapRow } from "@/lib/response-envelope"
import { env } from "@/config/env"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

interface EmployeeQueryResult {
  status: "ok"
  employee: Employee
}

/** Fila cruda de `pigse.fn_fun_buscar_por_pk` (V257) — sin jornada, estado
 * ni "información complementaria" (esos campos son de CEVAL, ver
 * V365/V366): solo lo que `pigse.TFUNCIONARIO`/`TUSUARIO` realmente tienen. */
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
  fk_establecimiento: number | null
  establecimiento_nombre: string | null
  fk_tlv_cargo: number | null
  roles: { idRole: number; nombre: string }[]
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
    employeeClass: null,
    educationLevel: null,
    grade: null,
    highestEducationLevel: null,
    fundingSource: null,
    functionalPosition: null,
    employmentType: null,
    address: "",
    // PIGSE no tiene "permisos" con jornada/estado (ver V365/V366) — se
    // reusa la forma de `Permission` solo para transportar el rol actual
    // hasta `dialog-manage.tsx` (que lee `permissions[0]?.role.id` como el
    // rol preseleccionado), con `workSchedule`/`status` en blanco porque no
    // aplican y nunca se leen para PIGSE.
    permissions: (row.roles ?? []).map((role, index) => ({
      order: index + 1,
      role: { id: role.idRole, code: "", name: role.nombre },
      workSchedule: { id: 0, code: "", name: "" },
      status: "ACTIVE" as const,
    })),
    status: "ACTIVE",
    establishment:
      row.fk_establecimiento === null
        ? null
        : {
            id: row.fk_establecimiento,
            code: String(row.fk_establecimiento),
            name: row.establecimiento_nombre ?? "",
          },
    cargo:
      row.fk_tlv_cargo === null
        ? null
        : { id: row.fk_tlv_cargo, code: String(row.fk_tlv_cargo), name: "" },
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
