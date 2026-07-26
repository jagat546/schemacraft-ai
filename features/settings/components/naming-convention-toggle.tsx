import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const OPTIONS = [
  { value: "snake_case", label: "snake_case", current: true },
  { value: "camelCase", label: "camelCase", current: false },
] as const

// Backend-gated shell (Engineering Spec §2 #12): this is a compiler-output
// concern, not a UI toggle — lib/compiler/sql only ever emits snake_case
// today. Disabled and labeled, matching DialectSelector's treatment.
export function NamingConventionToggle() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Naming Convention</span>
        <Badge variant="secondary">Coming soon</Badge>
      </div>
      <div
        role="group"
        aria-label="Naming convention (coming soon)"
        className="flex w-fit gap-1 rounded-lg border bg-muted/30 p-1"
      >
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled
            aria-pressed={option.current}
            className={cn(
              "cursor-not-allowed rounded-md px-3 py-1 text-sm font-medium disabled:opacity-100",
              option.current
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground opacity-60"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Column and table names are generated in snake_case today. A camelCase option is
        planned but not yet built.
      </p>
    </div>
  )
}
