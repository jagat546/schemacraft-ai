import type { CanonicalSchemaAST } from "@/lib/ast/types"
import { CompilerId, type CompilerResult, type SchemaCompiler } from "@/lib/compiler/types"
import { renderRelationshipsSection } from "@/lib/compiler/markdown/render-relationships-section"
import { renderTableSection } from "@/lib/compiler/markdown/render-table-section"

// Deterministic Markdown documentation from a CanonicalSchemaAST: an
// overview, a table of contents, one section per table (columns,
// indexes, constraints), and a global relationships section. Reads only
// CanonicalSchemaAST; makes no AI calls; never mutates the AST it is
// given.
export const markdownDocsCompiler: SchemaCompiler<string> = {
  id: CompilerId.MarkdownDocs,
  targetLanguage: "markdown",

  compile(ast: CanonicalSchemaAST): CompilerResult<string> {
    const tableCount = ast.tables.length
    const relationshipCount = ast.relationships.length

    const overview = [
      "# Schema Documentation",
      "",
      `AST version: \`${ast.astVersion}\``,
      "",
      `This schema has ${tableCount} table${tableCount === 1 ? "" : "s"} and ${relationshipCount} relationship${
        relationshipCount === 1 ? "" : "s"
      }.`,
      "",
      "## Table of Contents",
      "",
      ...ast.tables.map((table) => `- [${table.name}](#${slugify(table.name)})`),
    ].join("\n")

    const tableSections = ast.tables.map(renderTableSection)
    const relationshipsSection = renderRelationshipsSection(ast)

    return {
      ok: true,
      output: [overview, ...tableSections, relationshipsSection].join("\n\n"),
    }
  },
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
