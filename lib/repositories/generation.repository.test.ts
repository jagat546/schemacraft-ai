import { describe, expect, it } from "vitest"

import { countGenerationsByProject } from "@/lib/repositories/generation.repository"

describe("countGenerationsByProject", () => {
  it("returns an empty map for no rows", () => {
    expect(countGenerationsByProject([])).toEqual({})
  })

  it("counts multiple generations for the same project", () => {
    const rows = [{ project_id: "a" }, { project_id: "a" }, { project_id: "a" }]
    expect(countGenerationsByProject(rows)).toEqual({ a: 3 })
  })

  it("groups counts independently per project", () => {
    const rows = [{ project_id: "a" }, { project_id: "b" }, { project_id: "a" }, { project_id: "c" }]
    expect(countGenerationsByProject(rows)).toEqual({ a: 2, b: 1, c: 1 })
  })

  it("never includes a project with zero generations (absence, not a zero entry)", () => {
    const rows = [{ project_id: "a" }]
    const counts = countGenerationsByProject(rows)
    expect(counts.a).toBe(1)
    expect(counts.b).toBeUndefined()
  })
})
