import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import type { OperationTypeOption } from "@/features/administration/audits/api/types/audit-table"

/**
 * El backend real no expone un catálogo para esto: los tres tipos son un
 * enum cerrado del pipeline de CDC (`c`/`u`/`d` de Debezium, que el SQL de
 * V85 ya traduce a INSERT/UPDATE/DELETE) y no hay fila en `public.query` que
 * los liste. Se resuelven en el cliente en vez de pegarle a un endpoint que
 * devolvería 404.
 */
const OPERATION_TYPE_OPTIONS: OperationTypeOption[] = [
  { key: "INSERT", label: "Insert" },
  { key: "UPDATE", label: "Update" },
  { key: "DELETE", label: "Delete" },
]

function fetchAuditOperationTypes(): Promise<OperationTypeOption[]> {
  if (!env.ENABLE_API_MOCKING) return Promise.resolve(OPERATION_TYPE_OPTIONS)
  return api.get("/audit-operation-types")
}

export const auditOperationTypesQueryKey = () => ["audit-operation-types"]

export function useAuditOperationTypesQuery() {
  return useQuery({
    queryKey: auditOperationTypesQueryKey(),
    queryFn: fetchAuditOperationTypes,
    staleTime: Infinity,
  })
}
