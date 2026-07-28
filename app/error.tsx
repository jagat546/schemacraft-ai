"use client"

import { useEffect } from "react"
import { AlertCircleIcon } from "lucide-react"

import { ErrorState } from "@/components/patterns/error-state"

// S7-001: root-level error boundary (Next.js App Router convention) --
// catches an unexpected exception anywhere under app/layout.tsx (every
// route except the root layout itself, which global-error.tsx covers
// instead) and renders this product's own ErrorState pattern rather than
// Next's default crash screen. Client Component per Next's own
// requirement for error.tsx.
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <ErrorState
        icon={<AlertCircleIcon />}
        message="Something went wrong. This has been logged -- try again, or head back to the Dashboard."
        action={{ kind: "retry", label: "Try again", onClick: reset }}
        secondaryAction={{ kind: "back-to-dashboard", label: "Back to Dashboard", href: "/dashboard" }}
      />
    </div>
  )
}
