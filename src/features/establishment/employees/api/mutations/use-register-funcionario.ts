import { api } from "@/lib/api-client"
import { postMultipart } from "@/lib/files"

import type { Person } from "@/features/establishment/employees/api/types/person"

/**
 * Contrato real de POST /register/funcionario (auth-center, Java —
 * RegisterUsuarioRequest/RegisterResponse en
 * auth-center/src/main/java/com/co/eurekatic/auth/web/dto). Crea `public.users`
 * + TUSUARIO + TFUNCIONARIO (con FK_ESTABLECIMIENTO NULL, "pendiente de
 * enlazar") en una sola transacción — NO pasa por nuestro `query`, es un
 * endpoint del servicio de auth.
 *
 * REV: el body es `RegisterUsuarioRequest` PLANO — ya NO va envuelto en
 * `{usuario: {...}}` ni lleva `fkTmunicipioExpedicion` (confirmado tras el
 * merge de la rama del compañero: `RegisterFuncionarioRequest.java` se
 * eliminó, `AuthController.registerFuncionario` ahora recibe
 * `RegisterUsuarioRequest` directo — ver `FuncionarioRegistrationService`,
 * comentario "V62: fk_tmunicipio_expedicion ya no se pide aquí").
 *
 * `fn_fun_crear` (SQL, V51) ya soporta que la persona sea funcionario de
 * más de un EE: si el (tipo_documento, identificación) ya existe, reusa el
 * TUSUARIO y crea solo el TFUNCIONARIO nuevo, en vez de abortar. PERO este
 * endpoint sigue rechazando con 409 (`EmailAlreadyExistsException`) *antes*
 * de llegar a esa función si el `email` ya existe en `public.users` — ese
 * chequeo vive en Java (FuncionarioRegistrationService), fuera de alcance
 * acá. En la práctica: mismo documento + email distinto ya funciona de
 * punta a punta; mismo email todavía no (bloquea en Java).
 */
export interface RegisterFuncionarioResult {
  idUser: number
  pkTusuario: number
  pkFuncionario: number
  email: string
}

function toRegisterFuncionarioRequest(person: Person) {
  const fullName = [person.firstName, person.middleName, person.lastName, person.secondLastName]
    .filter(Boolean)
    .join(" ")

  return {
    email: person.email,
    fullName,
    password: person.password,
    identificacion: person.identification,
    primerNombre: person.firstName,
    primerApellido: person.lastName,
    fechaNacimiento: person.birthDate,
    fkTlvTipoDocumento: person.documentType?.id ?? null,
    fkTlvGenero: person.gender?.id ?? null,
    segundoNombre: person.middleName || undefined,
    segundoApellido: person.secondLastName || undefined,
    telefono: person.phone || undefined,
    // El front solo tiene un campo de correo; se manda igual como cuenta
    // (login) y como dato de contacto de TUSUARIO.
    correoElectronico: person.email || undefined,
  }
}

/**
 * `foto` (opcional) viaja como `fkTarchivoFoto`, el ÚNICO nombre declarado
 * `FILE:perfilUsuario` en `param_types`; cualquier otro lo rechaza
 * `file-service` con 400 antes de tocar S3.
 *
 * Con foto la petición va por `file-service` (`/files/register/funcionario`),
 * que sube el binario, lo registra en `TARCHIVO` y sustituye el campo por su
 * `pk_tarchivo` antes de reenviar a auth-center. Ojo con la URL: este destino
 * es un `endpoint` de auth-center, no una `query`, así que **no lleva prefijo
 * de microservicio** — ni `/auth` ni `/eval-col`, a diferencia de la ruta
 * directa de abajo.
 */
export async function registerFuncionario(
  person: Person,
  foto?: File | null,
): Promise<RegisterFuncionarioResult> {
  const body = toRegisterFuncionarioRequest(person)

  if (foto) {
    return postMultipart<RegisterFuncionarioResult>("/register/funcionario", body, {
      fkTarchivoFoto: foto,
    })
  }

  // El gateway enruta hacia auth-center por `requesturi: /api/auth/**`
  // (tabla `microservice`) — sin el segmento `/auth` la petición no
  // matchea ese patrón y el gateway responde 404 antes de llegar al
  // servicio, aunque el endpoint (`/register/funcionario`) sí está
  // registrado ahí. Confirmado probando ambas formas contra el backend
  // real.
  return api.post("/auth/register/funcionario", body)
}

// `enlazarFuncionarioEstablecimiento` (POST /funcionario/enlazar-establecimiento,
// fn_fun_enlazar_establecimiento V51) se retiró del front: con el cambio de
// modelo (TFUNCIONARIO pasó a ser una fila por persona, no por
// establecimiento, ver V51 REV5) ya no tiene sentido "enlazar" un
// funcionario a un EE en un paso aparte -- rector/secretaria se referencian
// directo vía TESTABLECIMIENTO.FK_TFUNCIONARIO_RECTOR/SECRETARIA dentro del
// propio fn_est_crear/fn_est_actualizar, y un funcionario regular ya no
// pertenece a un EE en particular. La función SQL sigue existiendo en la
// base (no se tocó), simplemente ningún caller del front la usa más.

/**
 * Deshace un `registerFuncionario` cuyo paso siguiente falló — el caso que
 * motivó esto: `add-establishment-page.tsx` registra al rector/secretaria
 * PRIMERO (necesita su `pkFuncionario` para `fn_est_crear`), y si crear o
 * enlazar el establecimiento falla DESPUÉS, ese `TFUNCIONARIO` quedaba
 * huérfano para siempre (`FK_ESTABLECIMIENTO` nunca se llenaba, y no había
 * forma de cancelarlo desde el front) — confirmado en datos reales
 * (`fn_fun_cancelar_pendiente`, V51 REV4).
 *
 * Solo cancela pendientes de verdad: si el `TFUNCIONARIO` ya está enlazado
 * a un EE, la función SQL lo rechaza (22023) — nunca puede usarse para dar
 * de baja a alguien real ya asignado. Idempotente: cancelar dos veces no
 * es un error.
 */
export async function cancelarFuncionarioPendiente(
  pkFuncionario: number,
): Promise<{ pkFuncionarioCancelado: number }> {
  return api.post("/eval-col/funcionario/cancelar-pendiente", { pkFuncionario })
}
