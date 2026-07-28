import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

// Placeholder, matching the existing DialectSelector/NamingConventionToggle
// pattern exactly: genuinely disabled at the DOM level, explicitly labeled,
// never a control that silently does nothing when clicked
// (Dashboard-Experience-Specification.md §Settings). No fake pricing table
// or invoice history -- current plan is read-only until a real billing
// system exists.
export function BillingSettings() {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">Current plan</span>
        <Badge variant="secondary">Free</Badge>
      </div>
      <Button disabled aria-label="Manage billing (coming soon)" className="w-fit" variant="outline">
        Manage billing
      </Button>
      <p className="text-body-sm text-text-secondary">
        Billing management isn&apos;t available yet. Every account is on the Free plan today.
      </p>
    </div>
  )
}
