import { describe, expect, it } from "vitest"

import { buildGeneratedArtifacts } from "@/lib/services/generation.service"
import { createCompilerRegistry, CompilerId, type CompileAllResult, type CompilerResult } from "@/lib/compiler"
import { buildAst } from "@/lib/compiler/test-helpers"

// buildGeneratedArtifacts is the integration seam between generic
// CompileAllResult[] (whatever createCompilerRegistry().compileAll()
// happened to produce) and GeneratedSchema (the concrete shape
// persistence/UI depends on) — exported specifically so it can be tested
// this way, per its own doc comment in generation.service.ts. This suite
// tests that mapping only: not individual compiler output content
// (lib/compiler/**/*.test.ts already covers that), not the full
// generateAndPersistSchema orchestrator (which calls Gemini and Supabase —
// explicitly out of scope here; no network calls, no Gemini API, no
// Supabase, no filesystem writes anywhere in this file).

function success(output: string): CompilerResult {
  return { ok: true, output }
}

// All 5 compilers succeeding is the common baseline most tests start
// from and then deliberately break one entry of — genuinely shared setup
// across this file's failure-simulation tests, not incidental repetition.
function fullCompileAllResult(overrides: Partial<Record<CompilerId, CompilerResult>> = {}): CompileAllResult[] {
  const merged: Record<CompilerId, CompilerResult> = {
    [CompilerId.PostgresSql]: success("-- sql placeholder"),
    [CompilerId.Drizzle]: success("// drizzle placeholder"),
    [CompilerId.JsonSample]: success("{}"),
    [CompilerId.MarkdownDocs]: success("# docs placeholder"),
    [CompilerId.MermaidDiagram]: success("erDiagram"),
    ...overrides,
  }
  return (Object.keys(merged) as CompilerId[]).map((id) => ({ id, result: merged[id] }))
}

function withoutCompiler(compiled: CompileAllResult[], id: CompilerId): CompileAllResult[] {
  return compiled.filter((entry) => entry.id !== id)
}

describe("buildGeneratedArtifacts", () => {
  describe("1. successful generation", () => {
    it("maps a real compileAll() output to a GeneratedSchema with every artifact present", () => {
      const ast = buildAst(
        [
          {
            name: "users",
            columns: [
              { name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true },
              { name: "email", type: "string", nullable: false, unique: true, primaryKey: false },
            ],
          },
          {
            name: "posts",
            columns: [
              { name: "id", type: "integer", nullable: false, unique: true, primaryKey: true },
              { name: "author_id", type: "uuid", nullable: false, unique: false, primaryKey: false },
            ],
          },
        ],
        [{ sourceTable: "posts", sourceColumns: ["author_id"], targetTable: "users", targetColumns: ["id"] }]
      )
      const compiled = createCompilerRegistry().compileAll(ast)

      const result = buildGeneratedArtifacts(compiled)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // Exactly these 5 keys, nothing missing, nothing extra.
      expect(Object.keys(result.data).sort()).toEqual(["documentation", "drizzle", "json", "mermaidDiagram", "sql"])
      // Content correctness is Phase 3's job (lib/compiler/**/*.test.ts) —
      // this only verifies presence and shape.
      expect(typeof result.data.sql).toBe("string")
      expect(result.data.sql.length).toBeGreaterThan(0)
      expect(typeof result.data.drizzle).toBe("string")
      expect(result.data.drizzle.length).toBeGreaterThan(0)
      expect(typeof result.data.json).toBe("string")
      expect(result.data.json.length).toBeGreaterThan(0)
      expect(typeof result.data.documentation).toBe("string")
      expect(result.data.documentation!.length).toBeGreaterThan(0)
      expect(typeof result.data.mermaidDiagram).toBe("string")
      expect(result.data.mermaidDiagram!.length).toBeGreaterThan(0)
    })
  })

  describe("2. failure of a required compiler", () => {
    it("fails overall when SQL fails, propagating and joining all its error messages, with no data field", () => {
      const compiled = fullCompileAllResult({
        [CompilerId.PostgresSql]: { ok: false, errors: ["error one", "error two"] },
      })
      const result = buildGeneratedArtifacts(compiled)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toBe("SQL compilation failed: error one error two")
      // No partial success: the failure result carries only `ok`/`error`,
      // never a `data` key alongside it.
      expect(Object.keys(result).sort()).toEqual(["error", "ok"])
    })

    it("fails overall when Drizzle fails, even though SQL (checked first) succeeded", () => {
      const compiled = fullCompileAllResult({
        [CompilerId.Drizzle]: { ok: false, errors: ["drizzle boom"] },
      })
      const result = buildGeneratedArtifacts(compiled)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toBe("Drizzle compilation failed: drizzle boom")
      expect(Object.keys(result).sort()).toEqual(["error", "ok"])
    })

    it("fails overall when JSON fails, even though SQL and Drizzle (checked first) succeeded", () => {
      const compiled = fullCompileAllResult({
        [CompilerId.JsonSample]: { ok: false, errors: ["json boom"] },
      })
      const result = buildGeneratedArtifacts(compiled)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toBe("JSON sample compilation failed: json boom")
      expect(Object.keys(result).sort()).toEqual(["error", "ok"])
    })
  })

  describe("3. failure of an optional compiler", () => {
    it("still succeeds when Markdown fails: required artifacts present, documentation omitted", () => {
      const compiled = fullCompileAllResult({
        [CompilerId.MarkdownDocs]: { ok: false, errors: ["docs boom"] },
      })
      const result = buildGeneratedArtifacts(compiled)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.data.sql).toBe("-- sql placeholder")
      expect(result.data.drizzle).toBe("// drizzle placeholder")
      expect(result.data.json).toBe("{}")
      expect(result.data.documentation).toBeUndefined()
      expect(result.data.mermaidDiagram).toBe("erDiagram")
    })

    it("still succeeds when Mermaid fails: required artifacts present, mermaidDiagram omitted", () => {
      const compiled = fullCompileAllResult({
        [CompilerId.MermaidDiagram]: { ok: false, errors: ["mermaid boom"] },
      })
      const result = buildGeneratedArtifacts(compiled)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.data.sql).toBe("-- sql placeholder")
      expect(result.data.drizzle).toBe("// drizzle placeholder")
      expect(result.data.json).toBe("{}")
      expect(result.data.documentation).toBe("# docs placeholder")
      expect(result.data.mermaidDiagram).toBeUndefined()
    })
  })

  describe("4. missing compiler registration", () => {
    it("reports 'not registered' (not 'compilation failed') when a required compiler is entirely absent", () => {
      // Distinct from Section 2's tests: those simulate a compiler that
      // ran and returned { ok: false }; this simulates one that was never
      // registered at all — byId.get() returns undefined, a different
      // branch in requireCompilerOutput.
      const compiled = withoutCompiler(fullCompileAllResult(), CompilerId.PostgresSql)
      const result = buildGeneratedArtifacts(compiled)
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toBe("SQL compiler is not registered.")
    })

    it("still succeeds, with the field omitted, when an optional compiler is entirely absent", () => {
      const compiled = withoutCompiler(fullCompileAllResult(), CompilerId.MermaidDiagram)
      const result = buildGeneratedArtifacts(compiled)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.data.mermaidDiagram).toBeUndefined()
      expect(result.data.documentation).toBe("# docs placeholder")
    })

    it("handles a completely empty registry gracefully, failing on the first required compiler checked (SQL)", () => {
      const result = buildGeneratedArtifacts([])
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.error).toBe("SQL compiler is not registered.")
    })
  })

  describe("5. determinism", () => {
    it("calling buildGeneratedArtifacts() twice against independently-produced compileAll() output for the same AST is identical", () => {
      const ast = buildAst([
        { name: "widgets", columns: [{ name: "id", type: "uuid", nullable: false, unique: true, primaryKey: true }] },
      ])
      const first = buildGeneratedArtifacts(createCompilerRegistry().compileAll(ast))
      const second = buildGeneratedArtifacts(createCompilerRegistry().compileAll(ast))
      expect(first).toEqual(second)
    })

    it("calling buildGeneratedArtifacts() twice on the exact same CompileAllResult[] input is identical", () => {
      const compiled = fullCompileAllResult()
      expect(buildGeneratedArtifacts(compiled)).toEqual(buildGeneratedArtifacts(compiled))
    })
  })
})
