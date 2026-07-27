"use client"

import { useEffect } from "react"
import { AlertCircleIcon } from "lucide-react"

import { ErrorState } from "@/components/patterns/error-state"

// S7-001: catches an exception thrown by the root layout itself (rare --
// error.tsx can't cover this, since it renders *inside* that layout).
// Next.js requires this file to render its own <html>/<body>, since it
// replaces the root layout entirely when this fires -- no ThemeProvider/
// ToastProvider available here, since those live in the layout that just
// failed; ErrorState/Button have no dependency on either, so this stays
// safe to render even in that state.
export default function GlobalError({
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
    <html lang="en">
      <body>
        <div className="flex min-h-svh items-center justify-center p-4">
          <ErrorState
            icon={<AlertCircleIcon />}
            message="Something went wrong loading the app. This has been logged -- try again."
            action={{ kind: "retry", label: "Try again", onClick: reset }}
          />
        </div>
      </body>
    </html>
  )
}
