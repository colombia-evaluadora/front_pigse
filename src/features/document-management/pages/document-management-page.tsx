import { DocumentManagementTable } from "@/features/document-management/components/table/table-documents"

/**
 * Pantalla "Gestión documental": los documentos institucionales del
 * establecimiento del usuario (PEI / PEC / PMI) con su estado de entrega y
 * las acciones por fila.
 *
 * El establecimiento NO se elige ni se pasa por parámetro: el backend lo
 * resuelve del token (`fn_pigse_mi_establecimiento(:CONTEXT.EMAIL)`), así que
 * un usuario solo puede ver y tocar los documentos del suyo. El nombre para
 * mostrar sale de la propia respuesta cuando el backend lo incluya.
 */
export function DocumentManagementPage() {
  return <DocumentManagementTable />
}
