import { useParams } from "@tanstack/react-router"

import { DocumentCategoriesTable } from "@/features/document-management/components/table/table-document-categories"
import type { DocumentType } from "@/features/document-management/api/types/document"

/**
 * Anexos de un PEI o PEC puntual (V512). `tipo` viaja en la URL
 * (`/gestion-documental/:tipo`) — la ruta valida que sea PEI o PEC antes de
 * montar esta página (ver `router.tsx`), así que acá se castea directo.
 */
export function DocumentCategoryDetailPage() {
  const { tipo } = useParams({ strict: false }) as { tipo: DocumentType }
  return <DocumentCategoriesTable type={tipo} />
}
