// Single source of truth for the sidebar's nav destinations and their
// labels — shared by AppSidebar (active-state highlighting) and PageTitle
// (route-derived header title), so a future route only needs one new
// entry here instead of two files independently hardcoding it (Code
// Review Iteration #2, High Priority 2).
export const NAV_ITEMS = [{ href: "/dashboard", label: "Generator" }] as const
