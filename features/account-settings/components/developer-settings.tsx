import { Badge } from "@/components/ui/badge"

// Same disabled-not-hidden pattern as PreferencesSettings, same reason:
// blocked on the user_preferences table, not yet applied.
export function DeveloperSettings() {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h3 className="text-h3 font-semibold text-text-primary">Developer</h3>
        <p className="text-body-sm text-text-secondary">
          Options aimed at this product&apos;s own audience.
        </p>
      </div>

      <label className="flex items-center justify-between gap-4 opacity-50">
        <span className="flex flex-col gap-0.5">
          <span className="flex items-center gap-2 text-body font-medium text-text-primary">
            Show raw project IDs
            <Badge variant="secondary">Coming soon</Badge>
          </span>
          <span className="text-body-sm text-text-secondary">
            Always show the UUID instead of the resolved project title where both are available.
          </span>
        </span>
        <input type="checkbox" role="switch" disabled aria-label="Show raw project IDs (coming soon)" />
      </label>
    </div>
  )
}
