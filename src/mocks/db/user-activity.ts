import { faker } from "@faker-js/faker"

import { establishmentsRowsDb } from "@/mocks/db/establishments"
import type { UserActivityRow } from "@/features/administration/user-activity/api/types/user-activity"

faker.seed(20260924)

const ROLE_SETS = ["PIGSE-RECTOR", "PIGSE-SECRETARIO", "PIGSE-RECTOR, PIGSE-SECRETARIO"]

function randomStatus(): UserActivityRow["estado"] {
  return faker.number.int({ min: 1, max: 100 }) <= 70 ? "CON_INGRESO" : "SIN_INGRESO"
}

function createUserActivityRow(usuarioId: number, establecimiento: { id: number; name: string }): UserActivityRow {
  const estado = randomStatus()
  const ultimoLogin = estado === "SIN_INGRESO" ? null : faker.date.recent({ days: 90 }).toISOString()
  const ultimaActividad = estado === "SIN_INGRESO" ? null : faker.date.recent({ days: 30 }).toISOString()

  return {
    establecimientoId: establecimiento.id,
    establecimientoCodigo: `EE-${String(establecimiento.id).padStart(4, "0")}`,
    establecimientoNombre: establecimiento.name,
    usuarioId,
    nombre: faker.person.fullName(),
    identificacion: faker.string.numeric({ length: 10, allowLeadingZeros: false }),
    correo: faker.internet.email(),
    roles: faker.helpers.arrayElement(ROLE_SETS),
    ultimoLogin,
    ultimaActividad,
    estado,
  }
}

// Una o dos filas (rector y/o secretario) por establecimiento — mismo
// criterio que el backend real: una fila por (establecimiento, usuario
// PIGSE activo).
let nextUsuarioId = 1
export const userActivityDb: UserActivityRow[] = establishmentsRowsDb.flatMap((establecimiento) =>
  Array.from({ length: faker.number.int({ min: 1, max: 2 }) }, () =>
    createUserActivityRow(nextUsuarioId++, establecimiento),
  ),
)
