// Cross-cutting UI chrome state that isn't already owned by another
// provider (sidebar open/collapsed state belongs to components/ui/sidebar's
// own SidebarProvider + cookie persistence; theme belongs to next-themes).
// Deliberately small: this store only holds state that's real today, not
// placeholders for features that haven't been scoped yet (e.g. a command
// palette) — see docs/architecture/frontend-modularization.md.
import { create } from "zustand"

import type { OutputVariant } from "@/types/ui"

export type UiStore = {
  activeOutputTab: OutputVariant
  setActiveOutputTab: (tab: OutputVariant) => void
}

export const useUiStore = create<UiStore>()((set) => ({
  activeOutputTab: "sql",
  setActiveOutputTab: (tab) => set({ activeOutputTab: tab }),
}))
