import { MonitoringComplianceTable } from "@/features/monitoring/components/table/table-compliance"

/**
 * Pantalla "Monitoreo y Consulta de Cumplimiento Institucional":
 * tablero del usuario monitor con las métricas globales de cumplimiento
 * documental (PEI / PEC / PMI) y el detalle por establecimiento educativo.
 *
 * Sigue el patrón canónico de las páginas de listado del aplicativo: la
 * página es una pieza mínima que delega toda la estructura (encabezado,
 * barras y tabla) en `MonitoringComplianceTable`, igual que `EstablishmentsPage`
 * delega en `EstablishmentsDataTable`.
 */
export function MonitoringCompliancePage() {
  return <MonitoringComplianceTable />
}
