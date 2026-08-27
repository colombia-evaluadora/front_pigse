import { cn } from "@/lib/utils"

interface ProgressBarProps {
  /** 0..100. */
  value: number
  className?: string
}

/**
 * Barra de progreso compacta que replica la del Figma: relleno del
 * porcentaje y resto en gris. El color del relleno sale del valor:
 * - < 50% → ámbar (va regular).
 * - >= 50% → verde (va bien).
 * - 100%   → verde sólido.
 *
 * Sin etiqueta visible: el porcentaje ya viene en el tooltip del header
 * cuando se ordena por esta columna.
 */
export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value))
  const fillClass = clamped >= 50 ? "bg-green" : "bg-yellow"

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-valuetext={`${clamped}%`}
      className={cn("flex items-center gap-2", className)}
    >
      <div className="h-2 w-full max-w-44 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-[width] duration-300", fillClass)}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="min-w-10 text-right text-xs font-medium tabular-nums text-muted-foreground">
        {clamped}%
      </span>
    </div>
  )
}
