// Cross-cutting UI chrome state that isn't already owned by another
// provider (sidebar open/collapsed state belongs to components/ui/sidebar's
// own SidebarProvider + cookie persistence; theme belongs to next-themes).
// Deliberately small: this store only holds state that's real today — see
// docs/architecture/frontend-modularization.md.
import { create } from "zustand"

import type { OutputVariant } from "@/types/ui"

export type UiStore = {
  activeOutputTab: OutputVariant
  setActiveOutputTab: (tab: OutputVariant) => void
  commandPaletteOpen: boolean
  setCommandPaletteOpen: (open: boolean) => void
  toggleCommandPalette: () => void
}

export const useUiStore = create<UiStore>()((set) => ({
  activeOutputTab: "sql",
  setActiveOutputTab: (tab) => set({ activeOutputTab: tab }),
  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  toggleCommandPalette: () => set((state) => ({ commandPaletteOpen: !state.commandPaletteOpen })),
}))
