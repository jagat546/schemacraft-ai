import type { CanonicalSchemaAST } from "@/lib/ast/types"
import { CompilerId, type CompilerResult, type SchemaCompiler } from "@/lib/compiler/types"
import { applyRelationships } from "@/lib/compiler/json/apply-relationships"
import { buildBaseRows } from "@/lib/compiler/json/sample-rows"

// Deterministic sample data: { [tableName]: sampleRow[] } for every
// table in the AST, with foreign keys pointing at real values from the
// referenced table's own generated rows. Reads only CanonicalSchemaAST;
// makes no AI calls; never mutates the AST it is given.
export const jsonSampleCompiler: SchemaCompiler<string> = {
  id: CompilerId.JsonSample,
  targetLanguage: "json",

  compile(ast: CanonicalSchemaAST): CompilerResult<string> {
    const rowsByTable = new Map<string, Record<string, unknown>[]>()
    for (const table of ast.tables) {
      rowsByTable.set(table.name.toLowerCase(), buildBaseRows(table))
    }

    applyRelationships(ast, rowsByTable)

    const output: Record<string, Record<string, unknown>[]> = {}
    for (const table of ast.tables) {
      output[table.name] = rowsByTable.get(table.name.toLowerCase()) ?? []
    }

    return { ok: true, output: JSON.stringify(output, null, 2) }
  },
}
