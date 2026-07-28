"use client"

import type { ReactNode } from "react"

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { useWorkbenchStore } from "@/lib/stores/workbench-store"

// Workbench-Experience-Specification.md §Fullscreen Mode: hides the sidebar
// and top bar only, reclaiming that space for the Workbench's own content
// (which keeps its own slim header -- that's workspace content, not app
// chrome). `sidebar`/`topNav` arrive as already-rendered elements from the
// Server Component layout above this (AppSidebar/TopNav are composed there,
// not re-implemented here) -- this wrapper only decides whether to mount
// them, reading the one piece of client state (isFullscreen) that decision
// depends on.
export function DashboardChrome({
  sidebar,
  topNav,
  children,
}: {
  sidebar: ReactNode
  topNav: ReactNode
  children: ReactNode
}) {
  const isFullscreen = useWorkbenchStore((state) => state.isFullscreen)

  return (
    <SidebarProvider className="h-svh overflow-hidden">
      {!isFullscreen && sidebar}
      <SidebarInset className="min-h-0">
        {!isFullscreen && topNav}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
