import type { CanonicalSchemaAST } from "@/lib/ast/types"
import type {
  CompileAllResult,
  CompilerId,
  CompilerOptions,
  SchemaCompiler,
} from "@/lib/compiler/types"

// Registration and lookup only — no compiler implementations are
// registered here. Concrete compilers (SQL, Drizzle, JSON, docs,
// Mermaid) call `register()` once they exist; lib/compiler/sql does this
// for the Postgres SQL compiler.
export class CompilerRegistry {
  private readonly compilers = new Map<CompilerId, SchemaCompiler>()

  register(compiler: SchemaCompiler): void {
    if (this.compilers.has(compiler.id)) {
      throw new Error(`A compiler is already registered with id "${compiler.id}".`)
    }
    this.compilers.set(compiler.id, compiler)
  }

  get(id: CompilerId): SchemaCompiler | undefined {
    return this.compilers.get(id)
  }

  list(): SchemaCompiler[] {
    return [...this.compilers.values()]
  }

  // Runs every registered compiler against the same AST and options.
  // Each compiler is independent — one compiler's failure does not stop
  // the others from running, since CompilerResult already carries
  // success/failure per compiler.
  compileAll(ast: CanonicalSchemaAST, options?: CompilerOptions): CompileAllResult[] {
    return this.list().map((compiler) => ({
      id: compiler.id,
      result: compiler.compile(ast, options),
    }))
  }
}
