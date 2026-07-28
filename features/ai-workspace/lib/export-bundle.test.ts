import { strFromU8, unzipSync } from "fflate"
import { describe, expect, it } from "vitest"

import { buildExportZip } from "@/features/ai-workspace/lib/export-bundle"
import type { GeneratedSchema } from "@/types/schema"

// No mermaidDiagram in this fixture: rendering it independently
// re-invokes mermaid.render(), which needs a browser-like DOM and is
// already exercised indirectly by staged-output-reveal.test.tsx (a real
// OutputTabs -> MermaidViewer render, passing under the dom project's
// jsdom polyfills). This test focuses on the zip-building logic itself.
const RESULT: GeneratedSchema = {
  sql: "CREATE TABLE users (id uuid PRIMARY KEY);",
  drizzle: "export const users = pgTable('users', {})",
  json: '{"users":[]}',
  documentation: "# Schema\n\nOne table.",
}

describe("buildExportZip", () => {
  it("produces a zip Blob containing exactly the artifacts present in the result", async () => {
    const blob = await buildExportZip(RESULT)
    expect(blob.type).toBe("application/zip")

    const buffer = new Uint8Array(await blob.arrayBuffer())
    const files = unzipSync(buffer)

    expect(Object.keys(files).sort()).toEqual(
      ["schema-documentation.md", "schema.json", "schema.sql", "schema.ts"].sort()
    )
    expect(strFromU8(files["schema.sql"])).toBe(RESULT.sql)
    expect(strFromU8(files["schema.ts"])).toBe(RESULT.drizzle)
    expect(strFromU8(files["schema.json"])).toBe(RESULT.json)
    expect(strFromU8(files["schema-documentation.md"])).toBe(RESULT.documentation)
  })

  it("omits optional artifacts (documentation, diagram) entirely when absent from the result", async () => {
    const minimal: GeneratedSchema = { sql: RESULT.sql, drizzle: RESULT.drizzle, json: RESULT.json }
    const blob = await buildExportZip(minimal)

    const buffer = new Uint8Array(await blob.arrayBuffer())
    const files = unzipSync(buffer)

    expect(Object.keys(files).sort()).toEqual(["schema.json", "schema.sql", "schema.ts"].sort())
  })
})
