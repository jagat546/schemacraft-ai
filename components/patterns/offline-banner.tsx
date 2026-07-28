import { WifiOffIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useOnlineStatus } from "@/hooks/use-online-status"

// Empty-States.md §Offline: a persistent, low-emphasis banner, not a
// full-page takeover -- the amber accent lives on the icon only (never
// color-alone), the surrounding text stays neutral. Auto-dismisses the
// moment connectivity returns, driven directly by useOnlineStatus rather
// than any grace-period timer.
export type OfflineBannerProps = {
  className?: string
}

export function OfflineBanner({ className }: OfflineBannerProps) {
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 bg-surface-1 px-4 py-2 text-text-secondary text-body-sm",
        className
      )}
    >
      <WifiOffIcon aria-hidden="true" className="size-4 text-warning" />
      <span>You&apos;re offline. Reconnect to continue.</span>
    </div>
  )
}
