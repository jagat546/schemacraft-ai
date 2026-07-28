import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Genuinely disabled, matching DialectSelector/BillingSettings exactly --
// not because the *idea* isn't decided (defaults for new projects, default
// post-login screen), but because persisting them needs the
// user_preferences table (lib/db/schema.ts), which has no migration
// applied yet and requires explicit sign-off before one is run (same
// discipline as S4-009's trigger). Shown, disabled, and labeled rather
// than hidden, so this control never silently does nothing.
export function PreferencesSettings() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-h3 font-semibold text-text-primary">Preferences</h3>
        <p className="text-body-sm text-text-secondary">Defaults applied to new projects.</p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Default SQL dialect</span>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
        <Select value="postgres" disabled>
          <SelectTrigger aria-label="Default SQL dialect (coming soon)" className="w-full sm:w-64">
            <SelectValue>PostgreSQL</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="postgres">PostgreSQL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Default naming convention</span>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
        <Select value="snake_case" disabled>
          <SelectTrigger
            aria-label="Default naming convention (coming soon)"
            className="w-full sm:w-64"
          >
            <SelectValue>snake_case</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="snake_case">snake_case</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <p className="text-body-sm text-text-secondary">
        Per-user defaults will apply here once account-level preferences are wired up. Every new
        project uses PostgreSQL and snake_case today.
      </p>
    </div>
  )
}
