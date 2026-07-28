"use client"

import { useEffect } from "react"
import { Maximize2Icon, Minimize2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useKeyboardShortcut } from "@/features/shell/components/keyboard-shortcut-provider"
import { useWorkbenchStore } from "@/lib/stores/workbench-store"

// Workbench-Experience-Specification.md §Fullscreen Mode.
export function FullscreenToggle() {
  const isFullscreen = useWorkbenchStore((state) => state.isFullscreen)
  const setFullscreen = useWorkbenchStore((state) => state.setFullscreen)
  const toggleFullscreen = useWorkbenchStore((state) => state.toggleFullscreen)

  // Fullscreen is explicitly transient (spec: "does not persist... it's a
  // transient viewing mode"). Forcing it off on unmount covers the case
  // where the user leaves the Workbench route some other way than Escape
  // or this toggle (a sidebar/breadcrumb Link, browser back) -- without
  // this, DashboardChrome would stay stuck hiding the sidebar/top bar on
  // whatever route the user landed on next.
  useEffect(() => {
    return () => setFullscreen(false)
  }, [setFullscreen])

  // Escape closing Monaco's own find widget already stops propagation (its
  // own well-known built-in behavior for a focused editor) -- so this only
  // ever fires when the editor isn't intercepting Escape first, which is
  // exactly the spec's "whichever is active" priority, with no custom
  // coordination code required.
  useKeyboardShortcut(
    "escape",
    () => {
      if (isFullscreen) setFullscreen(false)
    },
    "Exit fullscreen"
  )

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="outline"
              size="icon-sm"
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              aria-pressed={isFullscreen}
              onClick={toggleFullscreen}
            />
          }
        >
          {isFullscreen ? <Minimize2Icon /> : <Maximize2Icon />}
        </TooltipTrigger>
        <TooltipContent>{isFullscreen ? "Exit fullscreen" : "Fullscreen"}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
