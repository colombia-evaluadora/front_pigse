import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

/**
 * Adapta `Employee` al contrato real de `PUT /funcionarios/:ID`
 * (`pigse.fn_fun_actualizar`, V390 — uuid `pigse-funcionarios-actualizar`).
 *
 * Los binds son TOP-LEVEL (`:BODY.CORREOELECTRONICO`, no
 * `:BODY.PERSON.CORREOELECTRONICO`) — mandar cualquier clave no declarada
 * dispara el 400 de "placeholders sin tipo declarado" (mismo bug que
 * `/funcionarios/query` con roles/workSchedules).
 *
 * `fkEstablecimiento`/`fkTlvCargo` YA NO se mandan desde acá (V390): el
 * establecimiento de un funcionario se deriva de la sede al asignarle un
 * permiso (`fn_fun_permisos_actualizar`), y el cargo lo cubre el rol —
 * igual que en Colombia Evaluadora, que tiene las mismas columnas pero
 * tampoco las pide en el formulario. `employeeClass`/`educationLevel`/etc.
 * ("información complementaria", V390) SÍ viajan, con los mismos nombres
 * squasheados en camelCase que el resto de los binds.
 *
 * `password`/`birthDate`/`gender`/foto de perfil NO viajan por acá: esta
 * query no los declara (la contraseña la fija el propio usuario, no un
 * admin; género/nacimiento/foto son de `pigse.TUSUARIO` y no tienen
 * endpoint de edición todavía — fuera de alcance).
 */
function toRealBackendPayload(values: Employee) {
  return {
    correoElectronico: values.person.email || undefined,
    identificacion: values.person.identification || undefined,
    primerNombre: values.person.firstName || undefined,
    segundoNombre: values.person.middleName || undefined,
    primerApellido: values.person.lastName || undefined,
    segundoApellido: values.person.secondLastName || undefined,
    telefono: values.person.phone || undefined,
    fkTlvTipoDocumento: values.person.documentType?.id ?? undefined,
    fkTlvClaseFuncionario: values.employeeClass?.id ?? undefined,
    fkTlvNivelEnsenanza: values.educationLevel?.id ?? undefined,
    fkTlvGradoEscalafon: values.grade?.id ?? undefined,
    fkTlvNivelEducativo: values.highestEducationLevel?.id ?? undefined,
    fkTlvFuenteRecurso: values.fundingSource?.id ?? undefined,
    fkTlvCargoFuncional: values.functionalPosition?.id ?? undefined,
    fkTlvTipoVinculacion: values.employmentType?.id ?? undefined,
    direccion: values.address || undefined,
  }
}

function toOutgoingPayload(values: Employee) {
  return env.ENABLE_API_MOCKING ? values : toRealBackendPayload(values)
}

/**
 * PUT: `fn_fun_actualizar` (V257/V369) — update integral de los campos de
 * persona/funcionario que esa función soporta. PATCH es otra cosa en real
 * (`fn_fun_soft_delete`, ver `use-delete.ts`) — nunca se usa acá.
 *
 * `foto` queda sin efecto en real: no existe un `putMultipart` (el único
 * multipart real es PATCH vía file-service, que en PIGSE es la baja
 * lógica) — editar la foto de perfil sigue sin endpoint propio. Se
 * mantiene el parámetro para no romper el mock (que sí la persiste).
 */
export function update(
  employeeId: number,
  values: Employee,
  _foto?: File | null,
): Promise<{ status: "ok" | "error"; message: string; employee: Employee }> {
  const url = apiPath(`/establishments/employees/${employeeId}`, `/funcionarios/${employeeId}`)

  return api.put(url, toOutgoingPayload(values))
}
