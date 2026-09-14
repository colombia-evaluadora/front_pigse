import { useMutation, useQueryClient } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { MutationConfig } from "@/lib/react-query"
import type {
  RevertOperationChangeInput,
  RevertOperationChangeResponse,
} from "@/features/administration/audits/api/types/audit-table"

interface RevertOperationChangeVariables {
  tableSlug: string
  operationId: string
  // Lista de campos a revertir: el botón del dialog manda todos los que
  // muestra, pero el contrato del backend acepta cualquier subset.
  fieldIndexes: number[]
}

/**
 * Respuesta real de `POST /sso-admin/audit/revert` (`AuditRevertResponse`),
 * confirmada contra el backend de test. `applied=false` es lo que devuelve
 * un dry-run — acá siempre se ejecuta de verdad, así que un `false`
 * significaría que no se escribió nada.
 */
interface RealAuditRevertResponse {
  applied: boolean
  tabla: string
  /** "u" (update), "i" (insert), "d" (delete) — la operación revertida. */
  operacionOriginal: string
  pkColumn: string
  pkValue: string
  /** Columnas que el backend restauró, con su valor antes/después. */
  cambios: { columna: string; antes: unknown; despues: unknown }[]
  originalRequestId: string | null
  originalEtiqueta: string | null
  originalAppUser: string | null
  message: string
}

async function revertOperationChange({
  tableSlug,
  operationId,
  fieldIndexes,
}: RevertOperationChangeVariables): Promise<RevertOperationChangeResponse> {
  if (env.ENABLE_API_MOCKING) {
    const body: RevertOperationChangeInput = {
      tableSlug,
      operationId,
      changes: fieldIndexes.map((fieldIndex) => ({ fieldIndex })),
    }
    return api.post(
      `/audit-tables/${tableSlug}/operations/${operationId}/changes/revert`,
      body,
    )
  }

  // El revert real NO vive en la instancia de auditoría (ClickHouse es de
  // solo lectura por diseño): es `AuditRevertController` en sso-admin, que
  // escribe contra Postgres. Identifica el cambio por `(lsn, seq)` — el
  // mismo par que compone el `operationId` que arma ClickHouse
  // (`concat(toString(lsn), '-', toString(seq))`, ver V85 §1.3 y V90 §2.4).
  // Hoy cubre INSERT (revertido como soft-delete) y UPDATE genérico; el
  // DELETE físico lo rechaza. `fieldIndexes` no viaja: el backend decide qué
  // columnas restaura, no el caller.
  const [lsnRaw, seqRaw] = operationId.split("-")
  const lsn = Number(lsnRaw)
  const seq = Number(seqRaw)

  // Sin esta guarda, un id con otro formato mandaba `NaN` — que
  // `JSON.stringify` convierte en `null` — y el backend contestaba con un
  // error de validación sobre un campo nulo, que no le dice nada a nadie. El
  // problema es acá, así que el mensaje se escribe acá.
  if (!Number.isInteger(lsn) || !Number.isInteger(seq)) {
    throw new Error(
      `No se puede revertir esta operación: su identificador ("${operationId}") no tiene el formato "lsn-seq" que espera el servidor.`,
    )
  }

  const response = await api.post<RealAuditRevertResponse>("/sso-admin/audit/revert", {
    lsn,
    seq,
    dryRun: false,
  })

  return {
    status: response.applied ? "ok" : "error",
    message: response.message,
    // `cambios` trae una entrada por columna restaurada — es el conteo real,
    // no un sí/no sobre la fila.
    revertedFields: response.applied ? (response.cambios?.length ?? 1) : 0,
  }
}

interface UseRevertOperationChangeOptions {
  mutationConfig?: MutationConfig<typeof revertOperationChange>
}

export function useRevertOperationChange({ mutationConfig }: UseRevertOperationChangeOptions = {}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revertOperationChange,
    ...mutationConfig,
    // Refresca lo que el revert acaba de cambiar. Va DESPUÉS del spread de
    // `mutationConfig`: si quedara antes, `...mutationConfig` pisaría este
    // `onSuccess` entero (el del caller reemplaza, no se fusiona) y el
    // `invalidateQueries` nunca correría.
    onSuccess: (data, variables, onMutateResult, context) => {
      // El toast/cierre de dialog del caller va INMEDIATO — el POST /revert
      // ya confirmó el UPDATE contra Postgres, así que desde la perspectiva
      // del usuario la acción "ya pasó".
      mutationConfig?.onSuccess?.(data, variables, onMutateResult, context)

      // Las listas de auditoría, en cambio, NO leen Postgres — leen
      // ClickHouse, que se llena vía CDC (Postgres → Debezium → cdc-worker
      // → ClickHouse) con latencia real, no instantánea (encontrado en
      // vivo: `latencia_ms` de filas de reversión recientes entre ~20ms y
      // ~660ms, con margen para picos mayores bajo carga). Invalidar de
      // inmediato dispara el refetch ANTES de que la fila nueva exista en
      // ClickHouse — la consulta vuelve a traer exactamente lo mismo de
      // antes, y desde afuera se ve como "no se refrescó" hasta que alguien
      // refresca a mano más tarde (momento en el que el pipeline ya alcanzó
      // a propagar el cambio). No hay forma de esperar la propagación real
      // sin un mecanismo de notificación aparte (fuera de alcance acá), así
      // que se da un margen fijo -- suficiente para el caso común, no una
      // garantía absoluta bajo un pipeline con mucha carga.
      setTimeout(() => {
        // Prefijo sin el `operationId`: además del detalle de cambios
        // (`…/operations/:id/changes`) alcanza al listado de operaciones de
        // la tabla y a sus stats, que también cambian — el revert deja una
        // operación NUEVA registrada en la auditoría.
        queryClient.invalidateQueries({
          queryKey: ["audit-tables", variables.tableSlug, "operations"],
        })
        // El mismo revert puede dispararse desde la vista de una SESIÓN,
        // cuyo listado vive bajo otra clave y no cuelga de `audit-tables`.
        queryClient.invalidateQueries({ queryKey: ["audits", "sessions"] })
      }, 1500)
    },
  })
}
