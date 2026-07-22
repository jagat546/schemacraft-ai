import { CompilerRegistry } from "@/lib/compiler/registry"
import { drizzleCompiler } from "@/lib/compiler/drizzle"
import { jsonSampleCompiler } from "@/lib/compiler/json"
import { markdownDocsCompiler } from "@/lib/compiler/markdown"
import { mermaidDiagramCompiler } from "@/lib/compiler/mermaid"
import { postgresSqlCompiler } from "@/lib/compiler/sql"

export { CompilerRegistry } from "@/lib/compiler/registry"
export * from "@/lib/compiler/types"

// Builds a fresh registry with every implemented compiler registered.
// This is a factory, not a module-level singleton — importing this file
// has no side effects; a registry only exists once something calls
// createCompilerRegistry(), which lib/services/generation.service.ts does
// on every generation — see docs/architecture/sprint5-ast.md.
export function createCompilerRegistry(): CompilerRegistry {
  const registry = new CompilerRegistry()
  registry.register(postgresSqlCompiler)
  registry.register(drizzleCompiler)
  registry.register(jsonSampleCompiler)
  registry.register(markdownDocsCompiler)
  registry.register(mermaidDiagramCompiler)
  return registry
}
