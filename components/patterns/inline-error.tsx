import { cn } from "@/lib/utils"

// Error-Experience.md §Validation Errors: shown inline, at the specific
// field responsible, never a toast. Deliberately lighter than ErrorState --
// no icon, no action, no elevated surface -- since a field-level error sits
// directly beneath the input the user is already looking at.
export type InlineErrorProps = {
  message: string
  id?: string
  className?: string
}

export function InlineError({ message, id, className }: InlineErrorProps) {
  return (
    <p id={id} role="alert" className={cn("text-destructive text-body-sm", className)}>
      {message}
    </p>
  )
}
