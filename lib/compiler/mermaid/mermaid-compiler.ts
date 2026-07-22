import type { CanonicalSchemaAST } from "@/lib/ast/types"
import { relationshipsBySourceTable } from "@/lib/compiler/shared/column-flags"
import { CompilerId, type CompilerResult, type SchemaCompiler } from "@/lib/compiler/types"
import { renderEntityBlock } from "@/lib/compiler/mermaid/render-entity"
import { renderRelationshipLine } from "@/lib/compiler/mermaid/render-relationship"

// Deterministic Mermaid erDiagram source from a CanonicalSchemaAST: one
// entity block per table (PK/FK/UK tagged), one relationship line per
// AST relationship. Reads only CanonicalSchemaAST; makes no AI calls;
// never mutates the AST it is given.
export const mermaidDiagramCompiler: SchemaCompiler<string> = {
  id: CompilerId.MermaidDiagram,
  targetLanguage: "mermaid",

  compile(ast: CanonicalSchemaAST): CompilerResult<string> {
    const relationshipsByTable = relationshipsBySourceTable(ast)
    const tablesByName = new Map(ast.tables.map((table) => [table.name.toLowerCase(), table]))

    const entityBlocks = ast.tables.map((table) =>
      renderEntityBlock(table, relationshipsByTable.get(table.name.toLowerCase()))
    )

    const relationshipLines = ast.relationships
      .map((relationship) => {
        const sourceTable = tablesByName.get(relationship.sourceTable.toLowerCase())
        return sourceTable ? renderRelationshipLine(relationship, sourceTable) : undefined
      })
      .filter((line): line is string => line !== undefined)

    return { ok: true, output: ["erDiagram", ...entityBlocks, ...relationshipLines].join("\n") }
  },
}
