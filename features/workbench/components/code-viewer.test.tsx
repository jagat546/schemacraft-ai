// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CodeViewer } from "@/features/workbench/components/code-viewer"

// The real @monaco-editor/react is aliased to vitest.mocks/monaco-editor-react.tsx
// for the "dom" test project (see vitest.config.ts) -- it renders the same
// props CodeViewer passes down as inspectable data attributes, so these
// tests verify CodeViewer's own logic (language selection, read-only,
// minimap threshold), not Monaco's internals.
function manyLines(count: number): string {
  return Array.from({ length: count }, (_, i) => `line ${i}`).join("\n")
}

describe("CodeViewer", () => {
  it("is always read-only regardless of variant", async () => {
    render(<CodeViewer content="SELECT 1;" variant="sql" />)
    const stub = await screen.findByTestId("monaco-editor-stub")
    expect(stub.dataset.readonly).toBe("true")
  })

  it("maps each variant to Monaco's matching language id", async () => {
    const { rerender } = render(<CodeViewer content="SELECT 1;" variant="sql" />)
    expect((await screen.findByTestId("monaco-editor-stub")).dataset.language).toBe("sql")

    rerender(<CodeViewer content="export const x = 1" variant="drizzle" />)
    expect((await screen.findByTestId("monaco-editor-stub")).dataset.language).toBe("typescript")

    rerender(<CodeViewer content='{"a":1}' variant="json" />)
    expect((await screen.findByTestId("monaco-editor-stub")).dataset.language).toBe("json")
  })

  it("suppresses the minimap and its toggle under the line-count threshold", async () => {
    render(<CodeViewer content="SELECT 1;" variant="sql" />)
    expect((await screen.findByTestId("monaco-editor-stub")).dataset.minimapEnabled).toBe("false")
    expect(screen.queryByRole("button", { name: /minimap/i })).toBeNull()
  })

  it("enables the minimap by default and exposes a toggle at/above the line-count threshold", async () => {
    render(<CodeViewer content={manyLines(40)} variant="sql" />)
    expect((await screen.findByTestId("monaco-editor-stub")).dataset.minimapEnabled).toBe("true")

    const toggle = screen.getByRole("button", { name: /hide minimap/i })
    fireEvent.click(toggle)
    expect((await screen.findByTestId("monaco-editor-stub")).dataset.minimapEnabled).toBe("false")
  })
})
