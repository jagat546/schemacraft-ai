import type { CanonicalSchemaAST } from "@/lib/ast/types"

// A compiler turns a validated CanonicalSchemaAST into one concrete
// artifact (e.g. PostgreSQL DDL, a Drizzle model, sample JSON, Markdown
// docs, a Mermaid diagram). Compilers are pure, deterministic functions
// over the AST: no AI calls, no mutation of the AST they receive, no
// side effects.

// Stable identifiers for every known compiler target. New compilers add
// a member here rather than inventing an ad hoc string at the call
// site, so registry lookups and compileAll() results are typo-proof.
export const CompilerId = {
  PostgresSql: "sql.postgres",
  Drizzle: "drizzle",
  JsonSample: "json.sample",
  MarkdownDocs: "docs.markdown",
  MermaidDiagram: "diagram.mermaid",
} as const
export type CompilerId = (typeof CompilerId)[keyof typeof CompilerId]

export interface CompilerOptions {
  dialect?: string
  pretty?: boolean
  extensions?: Record<string, unknown>
}

export type CompilerResult<TOutput = string> =
  | { ok: true; output: TOutput; warnings?: string[] }
  | { ok: false; errors: string[] }

export interface SchemaCompiler<TOutput = string> {
  readonly id: CompilerId
  readonly targetLanguage: string
  compile(ast: CanonicalSchemaAST, options?: CompilerOptions): CompilerResult<TOutput>
}

// One entry per compiler run by CompilerRegistry.compileAll(). All
// current and near-term compiler targets (SQL, Drizzle, JSON, docs,
// Mermaid) produce text, so this simplifies to a string-output result
// rather than threading each compiler's own TOutput generic through the
// aggregate — revisit if a non-textual compiler target is ever added.
export interface CompileAllResult {
  id: CompilerId
  result: CompilerResult
}
