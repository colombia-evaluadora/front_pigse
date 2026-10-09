import { Badge } from "@/components/ui/badge"
import { CheckCircleFillIcon, CircleDashedIcon } from "@/components/ui/icons"

import type { ComplianceCategory, DocumentType } from "@/features/monitoring/api/types/compliance"
import { FileRow } from "@/features/monitoring/components/detail/file-row"

interface CategorySectionProps {
  category: ComplianceCategory
  type: DocumentType
  establishmentId: number
  establishmentName: string
}

/**
 * Un anexo del documento: si es obligatorio u opcional, si ya está cargado y
 * sus archivos ("Plan de estudios" puede tener varios). Un anexo faltante se
 * muestra igual, en punteado: es lo que el monitor tiene que reclamar.
 */
export function CategorySection({
  category,
  type,
  establishmentId,
  establishmentName,
}: CategorySectionProps) {
  const cargado = category.archivos.length > 0
  const headingId = `anexo-${category.categoria}`

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        {cargado ? (
          <CheckCircleFillIcon className="size-5 shrink-0 text-green" aria-hidden />
        ) : (
          <CircleDashedIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <h3 id={headingId} className="m-0! text-sm font-semibold">
          {category.categoriaName.replace(/\s*\(opcional\)\s*$/i, "")}
        </h3>
        <Badge variant="outline" color={category.obligatoria ? "neutral" : "muted"}>
          {category.obligatoria ? "Obligatorio" : "Opcional"}
        </Badge>
        {category.multiple && cargado ? (
          <span className="text-xs text-muted-foreground">
            {category.archivos.length} {category.archivos.length === 1 ? "archivo" : "archivos"}
          </span>
        ) : null}
        <span className="sr-only">{cargado ? "Cargado" : "Sin cargar"}</span>
      </div>

      {cargado ? (
        <ul className="m-0! flex list-none flex-col gap-2 p-0! sm:pl-7">
          {category.archivos.map((file) => (
            <FileRow
              key={file.id}
              file={file}
              type={type}
              establishmentId={establishmentId}
              establishmentName={establishmentName}
            />
          ))}
        </ul>
      ) : (
        <p className="m-0! rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground sm:ml-7">
          {category.status === "NO_APLICA"
            ? "No aplica a este establecimiento."
            : category.obligatoria
              ? "El establecimiento todavía no ha cargado este anexo."
              : "Sin archivo cargado (no es obligatorio)."}
        </p>
      )}
    </section>
  )
}
