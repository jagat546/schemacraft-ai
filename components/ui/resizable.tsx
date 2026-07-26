"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"

import { cn } from "@/lib/utils"

function ResizablePanelGroup({
  className,
  ...props
}: React.ComponentProps<typeof Group>) {
  return (
    <Group data-slot="resizable-panel-group" className={cn("flex h-full w-full", className)} {...props} />
  )
}

function ResizablePanel({
  className,
  ...props
}: React.ComponentProps<typeof Panel>) {
  return (
    <Panel data-slot="resizable-panel" className={cn("min-h-0 min-w-0", className)} {...props} />
  )
}

// react-resizable-panels 4.x doesn't expose an orientation data-attribute on
// the DOM (only aria-orientation, for a11y, not styling hooks) — the
// orientation this needs for conditional Tailwind classes is threaded
// through explicitly from the caller instead of read off the DOM.
function ResizableHandle({
  orientation = "horizontal",
  withHandle,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Separator> & {
  orientation?: "horizontal" | "vertical"
  withHandle?: boolean
}) {
  const isVertical = orientation === "vertical"

  return (
    <Separator
      data-slot="resizable-handle"
      className={cn(
        "relative flex items-center justify-center bg-border after:absolute after:-translate-x-1/2 after:-translate-y-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden",
        isVertical
          ? "h-px w-full cursor-row-resize after:inset-x-0 after:top-1/2 after:h-1"
          : "w-px cursor-col-resize after:inset-y-0 after:left-1/2 after:w-1",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div
          className={cn(
            "z-10 flex items-center justify-center rounded-xs border bg-border",
            isVertical ? "h-3 w-4" : "h-4 w-3"
          )}
        >
          <GripVerticalIcon className={cn("size-2.5", isVertical && "rotate-90")} />
        </div>
      )}
      {/* Optional overlay content (e.g. SplitPaneCanvas's panel-collapse
          chevrons) anchored to the handle itself -- the one place in the
          split that stays visible and clickable even when a neighboring
          panel is collapsed to 0 width, unlike a control placed inside
          either panel. Additive: existing callers pass no children, so
          nothing renders here for them. */}
      {children}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
