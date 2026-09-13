import { useQuery } from "@tanstack/react-query"

import { env } from "@/config/env"
import { api } from "@/lib/api-client"
import { AUDIT_API_PREFIX, apiPath } from "@/lib/api-paths"
import { unwrapRows, type RowsEnvelope } from "@/lib/response-envelope"
import { DEFAULT_AUDIT_TABLE_ICON, tableNameToLabel, slugToTableName } from "@/features/administration/audits/api/real-mapping"
import type { AuditTable } from "@/features/administration/audits/api/types/audit-table"

interface UseAuditTableQueryParams {
  tableSlug: string
  enabled?: boolean
}

/** Fila cruda de V85 §1.2. */
interface RealAuditTableDetailRow {
  slug: string
  name: string
  icon: string | null
  operationsToday: number
}

async function fetchAuditTable(tableSlug: string): Promise<AuditTable> {
  const path = apiPath(
    `/audit-tables/${tableSlug}`,
    `/audit-tables/${tableSlug}`,
    AUDIT_API_PREFIX,
  )

  if (env.ENABLE_API_MOCKING) {
    return api.get(path)
  }

  const response = await api.get<RowsEnvelope<RealAuditTableDetailRow>>(path)
  // El catálogo de V85 se deriva de `SELECT DISTINCT tabla FROM audit_log`, así
  // que una tabla auditada que todavía no tuvo ningún cambio no aparece y la
  // respuesta viene vacía. Eso no es un 404 —la tabla existe, solo no tiene
  // historial—, así que el detalle se arma desde el slug con la misma fórmula
  // que usa el SQL, en vez de romper la pantalla.
  const row = unwrapRows(response)[0]
  return {
    slug: row?.slug ?? tableSlug,
    name: row?.name || tableNameToLabel(slugToTableName(tableSlug)),
    icon: row?.icon ?? DEFAULT_AUDIT_TABLE_ICON,
    operationsToday: Number(row?.operationsToday ?? 0),
    // Sin catálogo de campos legibles en el backend — ver `real-mapping.ts`.
    fields: [],
  }
}

export function useAuditTableQuery({ tableSlug, enabled }: UseAuditTableQueryParams) {
  return useQuery({
    queryKey: ["audit-tables", tableSlug],
    queryFn: () => fetchAuditTable(tableSlug),
    enabled: enabled ?? true,
  })
}
