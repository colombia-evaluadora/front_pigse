import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ArrowCounterClockwiseIcon } from "@/components/ui/icons"

import type { OperationChange } from "@/features/administration/audits/api/types/audit-table"

interface OperationChangesTableProps {
  changes: OperationChange[]
}

/**
 * Tabla read-only con 4 columnas: Campo / Antes / Después del cambio /
 * Registro actual. La idea es que al revertir el usuario vea claramente
 * que el campo va a pasar de "Registro actual" a "Antes" — incluso si
 * "Después del cambio" difiere del "Registro actual" por operaciones
 * posteriores.
 */
export function OperationChangesTable({ changes }: OperationChangesTableProps) {
  if (changes.length === 0) return null

  return (
    <Table>
      <TableHeader className="sticky bg-background">
        <TableRow>
          <TableHead className="w-1/4">Campo</TableHead>
          <TableHead className="w-1/4">
            <span className="text-red flex items-center gap-1">
              Antes
              <ArrowCounterClockwiseIcon weight="bold" data-icon="inline-end" />
            </span>
          </TableHead>
          <TableHead className="w-1/4">
            <span className="text-emerald-600 dark:text-emerald-400">Después del cambio</span>
          </TableHead>
          <TableHead className="w-1/4">
            <span>Registro actual</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {changes.map((change) => {
          // Para el revert lo que importa es el "antes" — "después" e
          // "actual" son contexto. Estilizamos solo "actual" para que el
          // usuario vea de un vistazo qué se va a reemplazar.
          const willChange = change.before !== change.current
          return (
            <TableRow key={change.fieldIndex}>
              <TableCell className="font-medium">{change.field}</TableCell>
              <TableCell className="text-muted-foreground">{change.before ?? "---"}</TableCell>
              <TableCell className="text-emerald-600 dark:text-emerald-400">
                {change.after ?? "---"}
              </TableCell>
              <TableCell
                className={willChange ? "font-semibold text-foreground" : "text-muted-foreground"}
              >
                {change.current ?? "---"}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
