// @vitest-environment jsdom
import { act, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { StagedOutputReveal } from "@/features/ai-workspace/components/staged-output-reveal"
import type { GeneratedSchema } from "@/types/schema"

const RESULT: GeneratedSchema = {
  sql: "CREATE TABLE users (id uuid PRIMARY KEY);",
  drizzle: "export const users = pgTable(...)",
  json: '{"users": []}',
  documentation: "# Users",
  mermaidDiagram: "erDiagram\n  users",
}

// "SQL"/"Drizzle"/etc. legitimately appear more than once in the combined
// output (this indicator label, the OutputTabs tab trigger, CodeViewer's
// own language badge) -- every query below is scoped to the indicator row
// specifically, not the whole document.
function indicatorRow() {
  return document.querySelector('[aria-hidden="true"]') as HTMLElement
}

function readyDotCount() {
  return indicatorRow().querySelectorAll("span.bg-accent-emerald").length
}

// One act()-wrapped advance per stagger interval, not one large jump: each
// timer's own callback schedules the *next* one from inside a React
// effect, which needs its own render/effect pass to register before fake
// timers can see it -- a single large advanceTimersByTime call can land
// one step short of the true end state for exactly this reason.
function advanceStaggerSteps(steps: number) {
  for (let i = 0; i < steps; i++) {
    act(() => {
      vi.advanceTimersByTime(150)
    })
  }
}

describe("StagedOutputReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("reveals all five artifact labels, backed by data already present at mount", () => {
    render(<StagedOutputReveal result={RESULT} />)

    const row = within(indicatorRow())
    expect(row.getByText("SQL")).toBeTruthy()
    expect(row.getByText("Drizzle")).toBeTruthy()
    expect(row.getByText("JSON")).toBeTruthy()
    expect(row.getByText("Documentation")).toBeTruthy()
    expect(row.getByText("ER Diagram")).toBeTruthy()
  })

  it("reveals exactly one indicator at mount, then one more per stagger interval, in order", () => {
    render(<StagedOutputReveal result={RESULT} />)

    expect(readyDotCount()).toBe(1)

    advanceStaggerSteps(1)
    expect(readyDotCount()).toBe(2)

    advanceStaggerSteps(1)
    expect(readyDotCount()).toBe(3)

    advanceStaggerSteps(10)
    // Never exceeds the number of artifacts actually present, even once
    // every timer has long since fired.
    expect(readyDotCount()).toBe(5)
  })

  it("only reveals indicators for artifacts actually present in the result", () => {
    const partial: GeneratedSchema = { sql: RESULT.sql, drizzle: RESULT.drizzle, json: RESULT.json }
    render(<StagedOutputReveal result={partial} />)

    advanceStaggerSteps(10)

    const row = within(indicatorRow())
    expect(readyDotCount()).toBe(3)
    expect(row.queryByText("Documentation")).toBeNull()
    expect(row.queryByText("ER Diagram")).toBeNull()
  })

  it("renders the underlying OutputTabs content, fully interactive regardless of reveal progress", () => {
    render(<StagedOutputReveal result={RESULT} />)

    // The active tab (SQL, selected by default) renders its content
    // immediately -- staging paces the indicator dots only, never gates
    // the actual content.
    expect(screen.getByRole("tabpanel")).toBeTruthy()
  })
})
