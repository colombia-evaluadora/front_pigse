// Tipos compartidos por las mutaciones de exportación del módulo
// establishment. Mantenerlos en un archivo propio evita arrastrar
// dependencias de audits (u otros módulos) a este dominio y replica
// la convención que ya usa el módulo de auditorías.
export type ExportFormat = "pdf" | "excel"

export interface ExportResult {
  status: "ok" | "error"
  message: string
}
