import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { apiPath } from "@/lib/api-paths"
import { patchMultipart } from "@/lib/files"

import type { Employee } from "@/features/establishment/employees/api/types/employee"

/**
 * Adapta `Employee` al contrato del binding SQL real (`fn_fun_actualizar`,
 * PATCH parcial, `id_query=119`).
 *
 * El validador de placeholders de la plataforma recorre TODO el JSON del
 * body y exige que cada leaf tenga tipo declarado — mandar un `CatalogItem`
 * completo (`{id, code, name}`) donde la query solo declaró `…X.ID` deja
 * `.code`/`.name` sin declarar y rechaza la petición entera (mismo motivo
 * por el que se aplanó `zone` en los payloads de establecimientos). Acá la query NO
 * se tocó — sigue esperando `…X.ID`, así que en vez de aplanar a un número
 * plano se manda `{ id }` a secas (sin `code`/`name`) para cada catálogo:
 * `person.documentType`/`person.gender` (anidados) y `employeeClass`/
 * `educationLevel`/`grade`/`highestEducationLevel`/`fundingSource`/
 * `functionalPosition`/`employmentType` (sueltos).
 *
 * Nunca se manda `null` a secas donde la query espera bajar a `.ID` (mismo
 * motivo que `toSingleSort` en `sorting`): sin selección se manda
 * `{ id: null }`, no `null`, para que el validador pueda seguir bajando.
 *
 * Otros campos que se sacan del body porque no están declarados en la
 * query: `id` (el PK va por la URL, `PARAM.ID`), `person.password` (nunca
 * viaja — la contraseña definitiva la pone el usuario por correo),
 * `person.id`, `person.photoArchivoId` (de solo lectura — lo llena el GET
 * para poder pintar la foto ya guardada; la foto NUEVA a subir viaja
 * aparte, ver el parámetro `foto` de `update()`), `person.accountExists`
 * (bandera de solo-front que arma el autocompletado por documento —
 * `use-user-by-document.ts` — para bloquear el campo de contraseña; nunca
 * existió como columna, no tiene nada que hacer en el body), y
 * `permissions` (los permisos van aparte, ver `PUT /funcionario/:ID/permisos`
 * en `update-permissions.ts`).
 *
 * `person.birthDate` no es obligatorio: si el formulario lo deja vacío
 * (`""`), nunca se manda el string vacío tal cual — `fn_fun_actualizar`
 * hace `CAST(:BODY.PERSON.BIRTHDATE AS DATE)` y un `''` no es una fecha
 * válida para Postgres ("invalid input syntax for type date"). Se manda
 * `null` en su lugar para que la columna quede sin fecha.
 */
function toCatalogIdField(item: { id: number } | null | undefined) {
  return { id: item?.id ?? null }
}

function toRealBackendPayload(values: Employee) {
  const {
    id: _id,
    person: {
      password: _password,
      id: _personId,
      photoArchivoId: _photoArchivoId,
      accountExists: _accountExists,
      documentType,
      gender,
      birthDate,
      ...personRest
    },
    employeeClass,
    educationLevel,
    grade,
    highestEducationLevel,
    fundingSource,
    functionalPosition,
    employmentType,
    permissions: _permissions,
    ...rest
  } = values

  return {
    ...rest,
    person: {
      ...personRest,
      birthDate: birthDate || null,
      documentType: toCatalogIdField(documentType),
      gender: toCatalogIdField(gender),
    },
    employeeClass: toCatalogIdField(employeeClass),
    educationLevel: toCatalogIdField(educationLevel),
    grade: toCatalogIdField(grade),
    highestEducationLevel: toCatalogIdField(highestEducationLevel),
    fundingSource: toCatalogIdField(fundingSource),
    functionalPosition: toCatalogIdField(functionalPosition),
    employmentType: toCatalogIdField(employmentType),
  }
}

function toOutgoingPayload(values: Employee) {
  return env.ENABLE_API_MOCKING ? values : toRealBackendPayload(values)
}

/**
 * PATCH, no PUT: `PUT /funcionarios/:ID` ya es la baja
 * lógica (`fn_fun_baja_establecimiento`, ver use-delete.ts) — el PATCH es
 * el update integral de campos.
 *
 * `foto` (opcional) reemplaza la foto de perfil, y es el mismo PATCH parcial
 * de siempre solo que multipart — igual que el escudo en
 * `institution/api/mutations/create.ts`. Viaja como `fkTarchivoFoto`, el
 * nombre que `param_types` declara `FILE:perfilUsuario`; con cualquier otro,
 * `file-service` responde 400 antes de tocar S3.
 *
 * Sin foto nueva se manda el JSON plano de siempre: no se pasa por
 * `file-service` al pedo, y así tampoco se pisa la foto ya guardada.
 */
export function update(
  employeeId: number,
  values: Employee,
  foto?: File | null,
): Promise<{ status: "ok" | "error"; message: string; employee: Employee }> {
  const url = apiPath(
    `/establishments/employees/${employeeId}`,
    `/funcionarios/${employeeId}`,
  )

  if (env.ENABLE_API_MOCKING) return api.put(url, toOutgoingPayload(values))

  if (foto) {
    return patchMultipart(
      `/pigse/funcionarios/${employeeId}`,
      toOutgoingPayload(values),
      {
        fkTarchivoFoto: foto,
      },
    )
  }

  return api.patch(url, toOutgoingPayload(values))
}
