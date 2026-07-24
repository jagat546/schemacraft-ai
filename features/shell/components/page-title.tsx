"use client"

import { usePathname } from "next/navigation"

import { NAV_ITEMS } from "@/features/shell/lib/nav-items"

// The only piece of TopNav that needs client-side routing information —
// isolated here so TopNav itself can stay an async Server Component (it
// awaits getCurrentUser()). usePathname() has no Server Component
// equivalent for "which route is currently rendering inside this shared
// layout" (Code Review Iteration #2, High Priority 2).
export function PageTitle() {
  const pathname = usePathname()
  const activeItem = NAV_ITEMS.find((item) => item.href === pathname)

  return <span className="text-sm font-medium">{activeItem?.label ?? "SchemaCraft AI"}</span>
}
