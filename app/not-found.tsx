import { CompassIcon } from "lucide-react"

import { EmptyState } from "@/components/patterns/empty-state"

// S7-001: branded 404 for any unmatched route (Next.js App Router
// convention), replacing the framework's default not-found page. Links
// to "/" rather than "/dashboard" since this renders for both signed-in
// and signed-out visitors, and "/" is the one route that's always valid
// for either (the public marketing page).
export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <EmptyState
        icon={<CompassIcon />}
        message="This page doesn't exist, or you may not have access to it."
        action={{ label: "Go home", href: "/" }}
      />
    </div>
  )
}
