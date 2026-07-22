import type { CanonicalSchemaAST } from "@/lib/ast/types"
import { CompilerId, type CompilerResult, type SchemaCompiler } from "@/lib/compiler/types"
import { renderCreateIndexes } from "@/lib/compiler/sql/render-index"
import { renderForeignKeyConstraint } from "@/lib/compiler/sql/render-relationship"
import { renderCreateTable } from "@/lib/compiler/sql/render-table"

// Deterministic PostgreSQL DDL from a CanonicalSchemaAST. Output order
// only ever follows the AST's own array order (tables, then each
// table's indexes, then relationships) — never object-key iteration —
// so the same AST always produces byte-identical SQL. Reads only
// CanonicalSchemaAST; makes no AI calls; never mutates the AST it is
// given.
export const postgresSqlCompiler: SchemaCompiler<string> = {
  id: CompilerId.PostgresSql,
  targetLanguage: "sql",

  compile(ast: CanonicalSchemaAST): CompilerResult<string> {
    const tableStatements = ast.tables.map(renderCreateTable)
    const indexStatements = ast.tables.flatMap(renderCreateIndexes)
    const foreignKeyStatements = ast.relationships.map(renderForeignKeyConstraint)

    const sections = [tableStatements, indexStatements, foreignKeyStatements]
      .filter((section) => section.length > 0)
      .map((section) => section.join("\n"))

    return { ok: true, output: sections.join("\n\n") }
  },
}
