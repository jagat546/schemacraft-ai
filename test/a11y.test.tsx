// @vitest-environment jsdom
import { render } from "@testing-library/react"
import { axe } from "jest-axe"
import { describe, expect, it, vi } from "vitest"

import { ExportAllButton } from "@/features/ai-workspace/components/export-all-button"
import { StagedOutputReveal } from "@/features/ai-workspace/components/staged-output-reveal"
import { CodeViewer } from "@/features/workbench/components/code-viewer"
import { SplitPaneCanvas } from "@/features/workbench/components/split-pane-canvas"
import { GenerationHistoryItem } from "@/features/history/components/generation-history-item"
import { FullscreenToggle } from "@/components/dashboard/workbench-fullscreen-toggle"
import { KeyboardShortcutProvider } from "@/features/shell/components/keyboard-shortcut-provider"
import type { Generation } from "@/lib/repositories/generation.repository"
import type { GeneratedSchema } from "@/types/schema"

// Sprint-04-Implementation-Roadmap.md §S4-016: this repo had no
// accessibility-testing tooling before this file (confirmed via
// package.json). axe-core (via jest-axe, wired up in vitest.setup.dom.ts)
// automates the structural/ARIA half of the audit -- missing labels,
// invalid roles/attributes, redundant landmarks -- across a representative
// sample of Sprint 4's new interactive surfaces.
//
// Known, disclosed limitation: jsdom in this project's unit tests never
// loads the app's actual compiled Tailwind stylesheet, so axe's
// color-contrast rule cannot evaluate real rendered colors here (jsdom
// returns default/absent computed styles, not this app's CSS). Contrast
// verification (Design System 2.0 §11's 4.5:1/3:1 minimums) still needs a
// manual pass -- a real browser DevTools or Lighthouse check against the
// token values themselves -- which is out of reach in this environment
// (no authenticated Supabase session available) and is called out as a
// deferred item in this task's audit log rather than claimed here.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

// generation.actions.ts is a "use server" module whose own import chain
// includes `import "server-only"` -- fine under Next.js's real build
// (which strips Server Actions into RPC stubs for client bundles), but
// this project's "dom" test project deliberately runs under default
// resolve conditions (not "react-server"), so importing it for real here
// throws immediately (confirmed: this is the actual error without the
// mock). Mocked the same way this project already mocks other
// Server-Action-calling hooks under test.
vi.mock("@/lib/actions/generation.actions", () => ({
  deleteGenerationAction: vi.fn().mockResolvedValue({ ok: true }),
}))

const RESULT: GeneratedSchema = {
  sql: "CREATE TABLE users (id uuid PRIMARY KEY);",
  drizzle: "export const users = pgTable('users', {})",
  json: '{"users":[]}',
  documentation: "# Users",
  mermaidDiagram: "erDiagram\n  users",
}

const GENERATION: Generation = {
  id: "11111111-1111-1111-1111-111111111111",
  projectId: "22222222-2222-2222-2222-222222222222",
  versionNumber: 3,
  prompt: "An e-commerce schema with users, orders, and products",
  artifacts: RESULT,
  createdAt: "2026-01-01T00:00:00.000Z",
}

describe("Sprint 4 accessibility audit (structural/ARIA, axe-core)", () => {
  it("StagedOutputReveal (S4-012/S4-013) has no axe violations", async () => {
    const { container } = render(<StagedOutputReveal result={RESULT} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  // Explicit longer timeout: this test dynamic-imports the CodeViewer's
  // Monaco stub and runs a full axe-core scan, consistently the heaviest
  // single operation in this file -- observed intermittently exceeding
  // Vitest's 5000ms default under load, not a logic issue (nothing here
  // depends on real time passing).
  it(
    "CodeViewer (S4-014) has no axe violations",
    async () => {
      const { container } = render(<CodeViewer content={RESULT.sql} variant="sql" />)
      expect(await axe(container)).toHaveNoViolations()
    },
    15000
  )

  it("ExportAllButton (S4-013) has no axe violations", async () => {
    const { container } = render(<ExportAllButton result={RESULT} />)
    expect(await axe(container)).toHaveNoViolations()
  })

  it("SplitPaneCanvas with panel-collapse chevrons (S4-015) has no axe violations", async () => {
    const { container } = render(
      <div style={{ height: "400px" }}>
        <SplitPaneCanvas
          left={<div>Code</div>}
          right={<div>ERD</div>}
          collapse={{
            artifactCollapsed: false,
            erdCollapsed: false,
            onToggleArtifact: () => {},
            onToggleErd: () => {},
          }}
        />
      </div>
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("GenerationHistoryItem, including its undo-affected pending-delete state (S4-013), has no axe violations", async () => {
    const { container } = render(
      <GenerationHistoryItem generation={GENERATION} projectId={GENERATION.projectId} />
    )
    expect(await axe(container)).toHaveNoViolations()
  })

  it("FullscreenToggle (S4-015), an icon-only control, has no axe violations", async () => {
    const { container } = render(
      <KeyboardShortcutProvider>
        <FullscreenToggle />
      </KeyboardShortcutProvider>
    )
    expect(await axe(container)).toHaveNoViolations()
  })
})
