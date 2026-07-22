import type { CanonicalSchemaAST } from "@/lib/ast/types"
import { CompilerId, type CompilerResult, type SchemaCompiler } from "@/lib/compiler/types"
import { renderImports } from "@/lib/compiler/drizzle/imports"
import { renderRelationsBlocks } from "@/lib/compiler/drizzle/render-relations"
import { renderCreateTableDefinition } from "@/lib/compiler/drizzle/render-table"

const BYTEA_HELPER = [
  "const bytea = customType<{ data: Buffer }>({",
  "  dataType() {",
  '    return "bytea"',
  "  },",
  "})",
].join("\n")

// Deterministic drizzle-orm/pg-core model source (targeting the
// drizzle-orm version this project depends on — 0.45.x — matching the
// `pgTable(name, columns, (table) => [...])` array-builder form and
// `relations()` API already used in lib/db/schema.ts / lib/db/relations.ts)
// from a CanonicalSchemaAST. Reads only CanonicalSchemaAST; makes no AI
// calls; never mutates the AST it is given.
export const drizzleCompiler: SchemaCompiler<string> = {
  id: CompilerId.Drizzle,
  targetLanguage: "typescript",

  compile(ast: CanonicalSchemaAST): CompilerResult<string> {
    const pgCoreImports = new Set<string>()
    let needsSql = false
    let needsBytea = false

    const tableDefinitions = ast.tables.map((table) => {
      const rendered = renderCreateTableDefinition(table, ast)
      rendered.pgCoreImports.forEach((name) => pgCoreImports.add(name))
      needsSql = needsSql || rendered.usesSql
      needsBytea = needsBytea || rendered.usesBytea
      return rendered.code
    })

    const relationsBlocks = renderRelationsBlocks(ast)

    const importStatement = renderImports({
      pgCoreImports,
      needsSql,
      needsRelations: relationsBlocks.length > 0,
      needsBytea,
    })

    const sections = [
      importStatement,
      ...(needsBytea ? [BYTEA_HELPER] : []),
      ...tableDefinitions,
      ...relationsBlocks,
    ]

    return { ok: true, output: sections.join("\n\n") }
  },
}
