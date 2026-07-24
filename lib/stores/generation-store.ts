// Client-side state for the prompt-to-schema generation flow. This is a
// direct extraction of the GenerationState union that previously lived as
// local useState inside components/dashboard/schema-generator.tsx — same
// shape, now shared and independently testable. The store never calls the
// generateSchema Server Action itself; a feature hook (added when the AI
// Workspace module is built) owns that orchestration and pushes results in
// via these actions, keeping API calls out of both the store and the UI.
import { create } from "zustand"

import type { GeneratedSchema } from "@/types/schema"

export type GenerationState =
  | { status: "idle" }
  | { status: "generating" }
  | { status: "success"; data: GeneratedSchema }
  | { status: "error"; message: string }

export type GenerationStore = {
  prompt: string
  state: GenerationState
  setPrompt: (prompt: string) => void
  startGenerating: () => void
  succeed: (data: GeneratedSchema) => void
  fail: (message: string) => void
  reset: () => void
}

export const useGenerationStore = create<GenerationStore>()((set) => ({
  prompt: "",
  state: { status: "idle" },
  setPrompt: (prompt) => set({ prompt }),
  startGenerating: () => set({ state: { status: "generating" } }),
  succeed: (data) => set({ state: { status: "success", data } }),
  fail: (message) => set({ state: { status: "error", message } }),
  reset: () => set({ prompt: "", state: { status: "idle" } }),
}))
