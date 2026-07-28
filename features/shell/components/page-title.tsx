"use client"

import { usePathname } from "next/navigation"

import { Breadcrumbs } from "@/features/shell/components/breadcrumbs"
import { NAV_ITEMS } from "@/features/shell/lib/nav-items"

// Per-project routes (/dashboard/projects/[id]/<suffix>) aren't sidebar
// destinations, so they don't belong in NAV_ITEMS — but without a title of
// their own they fell back to the generic app name in the top bar (TD-018).
// Matched by suffix rather than a full path, since the dynamic [id] segment
// makes an exact NAV_ITEMS-style match impossible. Exported so Breadcrumbs
// (S4-005) resolves the same screen label from one source, not a second,
// duplicated suffix map.
export const DYNAMIC_ROUTE_TITLES = [
  { suffix: "/workbench", label: "Workbench" },
  { suffix: "/settings", label: "Project Settings" },
  { suffix: "/history", label: "History" },
] as const

// Guards the suffix match above to actual per-project routes only. Found
// live during the private-beta browser verification pass: without this,
// a bare `.endsWith(entry.suffix)` check also matches the account-level
// `/dashboard/settings` (a real NAV_ITEMS destination, "Account
// Settings") purely because it happens to share the "/settings" suffix
// with the per-project route this table was actually built for --
// showing "Project Settings" in the top bar/breadcrumb for a screen that
// has nothing to do with any project.
export function isProjectScopedRoute(pathname: string): boolean {
  return (
    /^\/dashboard\/projects\/[^/]+\//.test(pathname) &&
    DYNAMIC_ROUTE_TITLES.some((entry) => pathname.endsWith(entry.suffix))
  )
}

function resolvePageTitle(pathname: string): string {
  const navItem = NAV_ITEMS.find((item) => item.href === pathname)
  if (navItem) {
    return navItem.label
  }

  if (!isProjectScopedRoute(pathname)) {
    return "SchemaCraft AI"
  }

  const dynamicRoute = DYNAMIC_ROUTE_TITLES.find((entry) => pathname.endsWith(entry.suffix))
  return dynamicRoute?.label ?? "SchemaCraft AI"
}

// The only piece of TopNav that needs client-side routing information —
// isolated here so TopNav itself can stay an async Server Component (it
// awaits getCurrentUser()). usePathname() has no Server Component
// equivalent for "which route is currently rendering inside this shared
// layout" (Code Review Iteration #2, High Priority 2).
export function PageTitle() {
  const pathname = usePathname()

  if (isProjectScopedRoute(pathname)) {
    return <Breadcrumbs />
  }

  return <span className="text-sm font-medium">{resolvePageTitle(pathname)}</span>
}
