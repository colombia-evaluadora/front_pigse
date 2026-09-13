import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { unwrapRows } from "@/lib/response-envelope"

import type { CatalogItem } from "@/types/catalog"
import type { Person } from "@/features/establishment/employees/api/types/person"

/** Fila de `fn_usu_autocompletar_por_documento` (GET
 * /usuarios/autocompletar-por-documento, V51). Cada catálogo llega como
 * `fk_x` + `x_nombre` sueltos, mismo patrón que `fn_usu_empleado_buscar_por_pk`
 * (ver `use-employee.ts`) — no anidado. */
interface RealAutocompletarRow {
  pk_tusuario: number
  identificacion: string
  primer_nombre: string
  segundo_nombre: string | null
  primer_apellido: string
  segundo_apellido: string | null
  fecha_nacimiento: string | null
  fk_tlv_genero: number | null
  genero_nombre: string | null
  telefono: string | null
  correo_electronico: string | null
  fk_tarchivo_foto: number | null
  pk_tfuncionario_activo: number | null
}

/** Mismo criterio que `toCatalogItem` en `use-employee.ts`: el backend no
 * manda un `CatalogItem` anidado, así que se arma acá con el `code` que
 * usa el resto del real-mode para catálogos resueltos por PK (el número
 * como string — no hay una columna `codigo` separada que traer). */
function toGenderCatalogItem(id: number | null, name: string | null): CatalogItem | null {
  if (id === null || name === null) return null
  return { id, code: String(id), name }
}

/**
 * Autocompletado del form de persona (rector/secretaria de establecimiento,
 * alta de funcionario): busca un TUSUARIO existente por (tipo de documento,
 * identificación) y devuelve un patch para volcar sobre `Person` — todo
 * menos `documentType`/`identification` (esos ya los escribió el usuario
 * para poder buscar) ni `password` (nunca viaja de vuelta, ni existe en
 * TUSUARIO).
 *
 * REV: el patch trae `accountExists: true` — es la señal que usa
 * `UserDetailsForm` para bloquear el campo de contraseña (con puntitos, sin
 * poder tocarlo) en vez de seguir pidiéndola como si la persona fuera
 * nueva. Antes esto no se distinguía de un alta genuina, así que el form
 * exigía una contraseña igual, aunque el backend (`FuncionarioRegistration
 * Service`, REV V71) ya reconoce y reutiliza la cuenta existente por
 * documento/correo sin necesitar ninguna contraseña nueva — el usuario
 * queda ligado siendo el mismo, no se le cambia el login.
 *
 * `fn_fun_crear` (SQL) reusa el TUSUARIO por documento (o por correo) y
 * solo crea el TFUNCIONARIO nuevo, así que ya no hace falta preocuparse
 * por el 409 de correo duplicado que existía antes de V71.
 *
 * REV2 (cambio de modelo, V51 REV5): con TFUNCIONARIO como una fila por
 * persona (no por establecimiento), un TUSUARIO existente tiene a lo sumo
 * UN TFUNCIONARIO activo — ya no es ambiguo saber "cuál le corresponde". Si
 * existe, el patch trae `id: pkFuncionarioActivo` (el mismo campo que usa
 * el resto del código para decidir crear vs. actualizar un funcionario
 * puntual) — el caller ya sabe tratar esto como "editar a este
 * funcionario" en vez de "crear uno nuevo" sin ningún cambio extra (ver
 * `persistPersonIfAny` en `add-establishment-page.tsx`, o el efecto de
 * carga en `dialog-manage.tsx`).
 *
 * REV3: antes esto eran DOS llamadas (`fn_usu_buscar_por_documento` +
 * `fn_fun_activo_por_usuario`, esta última aparte) — se consolidaron en
 * `fn_usu_autocompletar_por_documento` (una sola query, un solo round
 * trip). De paso corrige un bug real: la fila de `fn_usu_buscar_por_documento`
 * SÍ traía `FK_TLV_GENERO`, pero esta interfaz nunca lo declaraba/leía, así
 * que el género quedaba en blanco después de autocompletar aunque la
 * persona sí lo tuviera cargado — no era un problema de cómo se renderizaba,
 * el dato nunca llegaba a `Person.gender`. La función nueva trae
 * `fk_tlv_genero` + `genero_nombre` (JOIN a TLISTA_VALOR, mismo patrón que
 * `fn_usu_empleado_buscar_por_pk` en `use-employee.ts`) para poder armar un
 * `CatalogItem` completo, no solo el `id`.
 *
 * REV4: mismo problema con `photoArchivoId` — nunca se traía. En el
 * diálogo de funcionario (`dialog-manage.tsx`) esto quedaba tapado porque,
 * cuando el match ya trae `id` (funcionario activo), se dispara además un
 * GET completo por PK que sí incluye la foto y pisa todo el estado. Pero en
 * el alta de establecimiento (`add-establishment-page.tsx`), que solo lee
 * este patch, la foto quedaba vacía aunque la persona tuviera una guardada
 * — y peor, si el usuario autocompletaba a alguien, luego cambiaba el
 * documento y autocompletaba a otra persona SIN foto, seguía mostrando la
 * foto de la primera (nada la limpiaba). `fk_tarchivo_foto` viaja siempre
 * en el patch (incluso `null`) para que el merge (`{...person, ...found}`
 * en `UserDetailsForm`) también pueda BORRAR una foto que ya no aplica, no
 * solo agregar una nueva.
 *
 * Solo corre contra el backend real: no hay endpoint de mock equivalente.
 */
export async function findPersonByDocument(
  documentTypeId: number,
  identification: string,
): Promise<Partial<Person> | null> {
  if (env.ENABLE_API_MOCKING) return null
  if (!documentTypeId || !identification.trim()) return null

  // El response interceptor de `api` ya desenvuelve `response.data` en
  // runtime (ver api-client.ts); el tipo de Axios no lo refleja, así que
  // se castea igual que en el resto de la app (p. ej. use-bulk-delete.ts).
  const response = (await api.get("/pigse/usuarios/autocompletar-por-documento", {
    params: { fkTlvTipoDocumento: documentTypeId, identificacion: identification },
  })) as unknown as RealAutocompletarRow[] | { rows: RealAutocompletarRow[] }
  const rows = unwrapRows<RealAutocompletarRow>(response)
  const row = rows[0]
  if (!row) return null

  return {
    firstName: row.primer_nombre,
    middleName: row.segundo_nombre ?? undefined,
    lastName: row.primer_apellido,
    secondLastName: row.segundo_apellido ?? undefined,
    birthDate: row.fecha_nacimiento ?? "",
    gender: toGenderCatalogItem(row.fk_tlv_genero, row.genero_nombre),
    phone: row.telefono ?? "",
    email: row.correo_electronico ?? "",
    photoArchivoId: row.fk_tarchivo_foto,
    accountExists: true,
    ...(row.pk_tfuncionario_activo ? { id: row.pk_tfuncionario_activo } : {}),
  }
}
