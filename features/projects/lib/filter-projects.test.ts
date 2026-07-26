import { describe, expect, it } from "vitest"

import { filterProjects } from "@/features/projects/lib/filter-projects"
import type { Project } from "@/lib/repositories/project.repository"

function makeProject(overrides: Partial<Project> & Pick<Project, "id" | "title">): Project {
  return {
    userId: "user-1",
    description: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

const PROJECTS = [
  makeProject({ id: "1", title: "Blog Schema" }),
  makeProject({ id: "2", title: "E-commerce Backend" }),
  makeProject({ id: "3", title: "Analytics Warehouse" }),
]

const COUNTS = { "1": 3, "2": 0 } // "3" has no entry -- absence means zero

describe("filterProjects", () => {
  it("returns every project when no query or filters are active", () => {
    const result = filterProjects(PROJECTS, { query: "", activeFilters: [], generationCounts: COUNTS })
    expect(result).toHaveLength(3)
  })

  it("filters by title, case-insensitively", () => {
    const result = filterProjects(PROJECTS, {
      query: "blog",
      activeFilters: [],
      generationCounts: COUNTS,
    })
    expect(result.map((p) => p.id)).toEqual(["1"])
  })

  it("filters to only projects with generations", () => {
    const result = filterProjects(PROJECTS, {
      query: "",
      activeFilters: ["has-generations"],
      generationCounts: COUNTS,
    })
    expect(result.map((p) => p.id)).toEqual(["1"])
  })

  it("filters to only empty projects, treating a missing count entry as zero", () => {
    const result = filterProjects(PROJECTS, {
      query: "",
      activeFilters: ["empty"],
      generationCounts: COUNTS,
    })
    expect(result.map((p) => p.id).sort()).toEqual(["2", "3"])
  })

  it("composes query and filters with AND logic", () => {
    const result = filterProjects(PROJECTS, {
      query: "e",
      activeFilters: ["empty"],
      generationCounts: COUNTS,
    })
    // "E-commerce Backend" (empty, matches "e") and "Analytics Warehouse"
    // (empty, matches "e") both qualify; "Blog Schema" has generations.
    expect(result.map((p) => p.id).sort()).toEqual(["2", "3"])
  })

  it("returns nothing when the query and filters have no overlap", () => {
    const result = filterProjects(PROJECTS, {
      query: "blog",
      activeFilters: ["empty"],
      generationCounts: COUNTS,
    })
    expect(result).toHaveLength(0)
  })
})
