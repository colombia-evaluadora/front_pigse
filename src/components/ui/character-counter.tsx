import { cn } from "@/lib/utils"

const LOW_REMAINING_THRESHOLD = 50

interface CharacterCounterProps extends React.ComponentProps<"span"> {
  value: string
  max: number
}

export function CharacterCounter({ value, max, className, ...props }: CharacterCounterProps) {
  const remaining = max - value.length

  return (
    <span
      data-slot="character-counter"
      className={cn(
        "block text-right text-xs text-muted-foreground",
        remaining <= LOW_REMAINING_THRESHOLD && "text-red",
        className,
      )}
      {...props}
    >
      {value.length}/{max}
    </span>
  )
}
