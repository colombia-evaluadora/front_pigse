import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

/**
 * Adapta `Employee` al contrato real de `PUT /funcionarios/:ID`
 * (`pigse.fn_fun_actualizar`, V257/V369 — uuid `pigse-funcionarios-actualizar`).
 *
 * Los binds son TOP-LEVEL (`:BODY.CORREO_ELECTRONICO`, no
 * `:BODY.PERSON.CORREO_ELECTRONICO`) y solo declaran los 10 campos que
 * `fn_fun_actualizar` acepta — nada de `employeeClass`/`educationLevel`/
 * `permissions`/etc. (modelo de CEVAL, sin columna en `pigse.TFUNCIONARIO`,
 * ver V365/V366): mandarlos dispara el 400 de "placeholders sin tipo
 * declarado" (mismo bug que `/funcionarios/query` con roles/workSchedules).
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
    fkTlvCargo: values.cargo?.id ?? undefined,
    fkEstablecimiento: values.establishment?.id ?? undefined,
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
