import { LayoutDashboard, Settings, Sparkles } from "lucide-react"

// Single source of truth for the sidebar's nav destinations and their
// labels — shared by AppSidebar (active-state highlighting) and PageTitle
// (route-derived header title), so a future route only needs one new
// entry here instead of two files independently hardcoding it (Code
// Review Iteration #2, High Priority 2).
//
// `icon` is per-destination (Design System 2.0 §9: nav icons must be
// distinct per destination, not a single repeated glyph) — Sparkles is
// reserved for Generator specifically, since "AI-generation magic" is
// the one destination that earns it.
//
// Account Settings (S4-005) is a stub nav entry only -- its route target
// (/dashboard/settings) doesn't exist yet; S4-010 builds the real screen.
export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/generator", label: "Generator", icon: Sparkles },
  { href: "/dashboard/settings", label: "Account Settings", icon: Settings },
] as const
